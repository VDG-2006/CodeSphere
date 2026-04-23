const axios = require('axios');
const StatsCache = require('../models/StatsCache');

// Mapping Pattern: Eliminates O(N) if/else conditions for URLs
const API_ENDPOINTS = {
  leetcode_profile: (handle) => `https://leetcode-api-pied.vercel.app/${handle}`,
  leetcode_contest: (handle) => `https://leetcode-api-pied.vercel.app/contest/${handle}`,
  codeforces: (handle) => `https://codeforces.com/api/user.info?handles=${handle}`,
  codeforces_rating: (handle) => `https://codeforces.com/api/user.rating?handle=${handle}`
};

const fetchAndCache = async (platform, handle) => {
  const cached = await StatsCache.findOne({ platform, handle });
  const isFresh = cached && (Date.now() - new Date(cached.lastUpdated).getTime() < 60000);

  if (isFresh) return cached.data;

  try {
    let resultData = {};

    if (platform === 'leetcode') {
      // Parallel fetch for Profile and Contest data
      const [profileRes, contestRes] = await Promise.all([
        axios.get(API_ENDPOINTS.leetcode_profile(handle)),
        axios.get(API_ENDPOINTS.leetcode_contest(handle))
      ]);

      const profile = profileRes.data;
      const contest = contestRes.data;

      resultData = {
        totalSolved: profile.totalSolved || 0,
        contestRating: Math.round(contest.contestRating || 0),
        globalRank: contest.contestGlobalRanking || 0,
        contestHistory: (contest.contestHistory || []).filter(h => h.attended === true),
        raw: { profile, contest }
      };
    } else {
      const url = API_ENDPOINTS[platform](handle);
      const res = await axios.get(url);
      resultData = { raw: res.data };
    }

    await StatsCache.findOneAndUpdate(
      { platform, handle },
      { data: resultData, lastUpdated: Date.now() },
      { upsert: true, new: true }
    );

    return resultData;
  } catch (err) {
    if (cached) {
      console.warn(`[Fallback] Served stale ${platform} data for ${handle} due to upstream failure.`);
      return cached.data;
    }
    throw new Error(`Upstream fetch failed: ${err.message}`);
  }
};

exports.getPlatformStats = async (req, res, next) => {
  try {
    const { platform, handle } = req.params;
    const data = await fetchAndCache(platform, handle);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
