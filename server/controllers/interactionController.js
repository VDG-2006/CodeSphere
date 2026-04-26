const Video = require('../models/Video');
const User = require('../models/User');

// Toggle Like on a Video
exports.toggleLike = async (req, res, next) => {
  try {
    const videoId = req.params.id;
    const userId = req.user.id;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const hasLiked = video.likedBy.includes(userId);

    if (hasLiked) {
      // Unlike
      video.likedBy = video.likedBy.filter(id => id.toString() !== userId);
      video.likes = Math.max(0, video.likes - 1);
    } else {
      // Like
      video.likedBy.push(userId);
      video.likes += 1;
    }

    await video.save();

    res.json({ 
      success: true, 
      message: hasLiked ? 'Unliked video' : 'Liked video',
      isLiked: !hasLiked,
      likesCount: video.likes
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Subscribe to a Creator
exports.toggleSubscribe = async (req, res, next) => {
  try {
    const creatorId = req.params.creatorId;
    const userId = req.user.id;

    if (creatorId === userId) {
      return res.status(400).json({ success: false, message: 'Cannot subscribe to yourself' });
    }

    const user = await User.findById(userId);
    const creator = await User.findById(creatorId);

    if (!creator) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }

    const isSubscribed = user.subscriptions.includes(creatorId);

    if (isSubscribed) {
      // Unsubscribe
      user.subscriptions = user.subscriptions.filter(id => id.toString() !== creatorId);
      creator.subscribersCount = Math.max(0, creator.subscribersCount - 1);
    } else {
      // Subscribe
      user.subscriptions.push(creatorId);
      creator.subscribersCount += 1;
    }

    await user.save();
    await creator.save();

    res.json({
      success: true,
      message: isSubscribed ? 'Unsubscribed' : 'Subscribed',
      isSubscribed: !isSubscribed,
      subscribersCount: creator.subscribersCount
    });
  } catch (error) {
    next(error);
  }
};

// Get User State for a Video (Is Liked? Is Subscribed?)
exports.getUserVideoState = async (req, res, next) => {
  try {
    const videoId = req.params.id;
    const userId = req.user.id;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const isLiked = video.likedBy.includes(userId);
    let isSubscribed = false;

    // Check if subscribed to the creator
    if (video.creator) {
      const user = await User.findById(userId);
      isSubscribed = user.subscriptions.includes(video.creator.toString());
    }

    res.json({
      success: true,
      isLiked,
      isSubscribed,
      likesCount: video.likes,
      creatorId: video.creator ? video.creator.toString() : null
    });
  } catch (error) {
    next(error);
  }
};
