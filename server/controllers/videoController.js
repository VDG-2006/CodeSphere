const Video = require('../models/Video');

// Get all videos with optional category filter
exports.getVideos = async (req, res, next) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category && category !== 'Home') {
      query.category = category;
    }
    
    const videos = await Video.find(query).sort({ createdAt: -1 }).populate('creator', 'username avatarUrl');
    res.json({ success: true, count: videos.length, data: videos });
  } catch (error) {
    next(error);
  }
};

// Get trending videos (sorted by views)
exports.getTrending = async (req, res, next) => {
  try {
    const videos = await Video.find({}).sort({ views: -1 }).limit(10).populate('creator', 'username avatarUrl');
    res.json({ success: true, data: videos });
  } catch (error) {
    next(error);
  }
};

// Get single video
exports.getVideoById = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id).populate('creator', 'username avatarUrl');
    if (!video) {
       return res.status(404).json({ success: false, message: 'Video not found' });
    }
    // Increment views
    video.views += 1;
    await video.save();
    
    res.json({ success: true, data: video });
  } catch (error) {
    next(error);
  }
};

// Seed Mock Data
exports.seedVideos = async (req, res, next) => {
  try {
    const mockVideos = [
      {
        title: "Mastering Java Streams in 10 Minutes",
        description: "Learn how to use Java Streams API to write cleaner and more efficient code.",
        thumbnailUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=400",
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        category: "Java",
        views: 1205,
        likes: 450,
        duration: "10:24"
      },
      {
        title: "Advanced DSA: Graph Traversal Algorithms",
        description: "Deep dive into BFS and DFS with real-world problem-solving examples.",
        thumbnailUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=400",
        videoUrl: "https://www.w3schools.com/html/movie.mp4",
        category: "DSA",
        views: 890,
        likes: 310,
        duration: "15:45"
      },
      {
        title: "React vs Vue in 2026: The Ultimate Comparison",
        description: "Which frontend framework should you choose for your next big project?",
        thumbnailUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=400",
        videoUrl: "https://raw.githubusercontent.com/bower-media-samples/big-buck-bunny-1080p-30s/master/video.mp4",
        category: "WebDev",
        views: 3400,
        likes: 1200,
        duration: "08:12"
      }
    ];

    await Video.deleteMany({});
    const created = await Video.insertMany(mockVideos);
    res.json({ success: true, message: "Mock videos seeded", count: created.length });
  } catch (error) {
    next(error);
  }
};
