const { z } = require('zod');

// Zod Schema Definition
const statsParamSchema = z.object({
  platform: z.enum(['leetcode', 'leetcode_solved', 'codeforces', 'codeforces_rating'], {
    errorMap: () => ({ message: "Platform must be one of: leetcode, leetcode_solved, codeforces, codeforces_rating" })
  }),
  handle: z.string().min(1, { message: "Handle cannot be empty" })
});

exports.validateStatsRequest = (req, res, next) => {
  try {
    statsParamSchema.parse(req.params);
    next();
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: "Invalid API parameters", 
      errors: error.errors.map(e => e.message) 
    });
  }
};
