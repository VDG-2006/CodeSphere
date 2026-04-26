const axios = require('axios');
const User = require('../models/User');

/**
 * Unified Official Stats Sync (LeetCode + CodeForces)
 * Implementing Official Proxy Strategy with Real Solved Counts and Submission Calendar
 */
exports.syncAllStats = async (req, res, next) => {
  const TIMEOUT = 5000;
  
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const leetcode = user.handles?.leetcode?.trim();
    const codeforces = user.handles?.codeforces?.trim();

    console.log(`[Proxy] Syncing for User: ${user.username} | LC: ${leetcode} | CF: ${codeforces}`);

    if (!leetcode && !codeforces) {
      return res.status(400).json({ success: false, message: 'No handles configured' });
    }

    const tasks = [];
    if (leetcode) {
      tasks.push(axios.post('https://leetcode.com/graphql', {
        query: `
        query userContestRankingInfo($username: String!) {
          userContestRanking(username: $username) {
            rating
            globalRanking
            topPercentage
          }
          userContestRankingHistory(username: $username) {
            attended
            rating
            ranking
            contest { title startTime }
          }
          matchedUser(username: $username) {
            userCalendar {
              submissionCalendar
              activeYears
            }
            submitStats {
              acSubmissionNum { difficulty count }
            }
            languageProblemCount {
              languageName
              problemsSolved
            }
          }
        }`,
        variables: { username: leetcode }
      }, { 
        headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com/' },
        timeout: TIMEOUT 
      }).then(r => ({ platform: 'leetcode', data: r.data.data })));
    }

    if (codeforces) {
      tasks.push(axios.get(`https://codeforces.com/api/user.rating?handle=${codeforces}`, { timeout: TIMEOUT })
        .then(r => ({ platform: 'cf_rating', data: r.data.result })));
      tasks.push(axios.get(`https://codeforces.com/api/user.info?handles=${codeforces}`, { timeout: TIMEOUT })
        .then(r => ({ platform: 'cf_info', data: r.data.result[0] })));
      tasks.push(axios.get(`https://codeforces.com/api/user.status?handle=${codeforces}`, { timeout: TIMEOUT })
        .then(r => ({ platform: 'cf_status', data: r.data.result })));
    }

    const results = await Promise.allSettled(tasks);
    
    const finalData = { leetcode: null, codeforces: null };
    if (leetcode) finalData.leetcode = {};
    if (codeforces) finalData.codeforces = { totalSolved: 0 };

    results.forEach((res, idx) => {
      if (res.status === 'fulfilled') {
        const { platform, data } = res.value;
        if (!data) return;

        if (platform === 'leetcode') {
          const history = (data.userContestRankingHistory || []).filter(c => c.attended);
          const highestRating = history.length > 0 ? Math.max(...history.map(h => h.rating)) : 0;
          const lastContestRank = history.length > 0 ? history[history.length - 1].ranking : "N/A";
          const solved = data.matchedUser?.submitStats?.acSubmissionNum || [];
          const getSolvedCount = (diff) => (solved.find(s => s.difficulty === diff) || { count: 0 }).count;

          // Process Submission Calendar
          const rawCalendar = JSON.parse(data.matchedUser?.userCalendar?.submissionCalendar || '{}');
          const submissions = Object.keys(rawCalendar).map(ts => ({
            timestamp: parseInt(ts),
            count: rawCalendar[ts]
          }));

          finalData.leetcode = {
            handle: leetcode,
            currentRating: data.userContestRanking ? Math.round(data.userContestRanking.rating) : 0,
            highestRating: Math.round(highestRating),
            lastContestRank: lastContestRank,
            rank: data.userContestRanking?.globalRanking || "N/A",
            totalSolved: getSolvedCount('All'),
            easySolved: getSolvedCount('Easy'),
            mediumSolved: getSolvedCount('Medium'),
            hardSolved: getSolvedCount('Hard'),
            languages: data.matchedUser?.languageProblemCount || [],
            history: history.map(h => ({
              rating: h.rating,
              title: h.contest.title,
              time: h.contest.startTime
            })),
            submissions: submissions
          };
        } else if (platform === 'cf_info') {
          finalData.codeforces = { ...finalData.codeforces,
            handle: codeforces,
            currentRating: data.rating || 0,
            highestRating: data.maxRating || 0,
            rank: data.rank || "newbie"
          };
        } else if (platform === 'cf_rating') {
          const lastContest = data.length > 0 ? data[data.length - 1] : null;
          finalData.codeforces = { ...finalData.codeforces,
            lastContestRank: lastContest ? lastContest.rank : "N/A",
            history: data.map(h => ({
              rating: h.newRating,
              title: h.contestName,
              time: h.ratingUpdateTimeSeconds
            }))
          };
        } else if (platform === 'cf_status') {
          const solvedSet = new Set();
          const cfSubmissions = []; // To supplement the heatmap
          const dayMap = {};

          data.forEach(sub => {
            if (sub.verdict === 'OK') {
              const problemId = `${sub.problem.contestId}${sub.problem.index}`;
              solvedSet.add(problemId);
              
              const dayTs = Math.floor(sub.creationTimeSeconds / 86400) * 86400;
              dayMap[dayTs] = (dayMap[dayTs] || 0) + 1;
            }
          });

          Object.keys(dayMap).forEach(ts => {
            cfSubmissions.push({ timestamp: parseInt(ts), count: dayMap[ts] });
          });

          finalData.codeforces = { ...finalData.codeforces,
            totalSolved: solvedSet.size,
            submissions: cfSubmissions
          };
        }
      }
    });

    res.json({ success: true, data: finalData });

  } catch (error) {
    console.error("[Proxy] Sync Error:", error.message);
    res.status(500).json({ success: false, message: "Official source sync failed" });
  }
};

exports.getPlatformStats = exports.syncAllStats;
