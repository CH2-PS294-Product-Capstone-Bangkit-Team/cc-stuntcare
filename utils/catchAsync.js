module.exports = (func) => {
  return (req, res, next) => {
    func(req, res, next).catch((error) => {
      console.error('Error caught in catchAsync:', error);
      next(error); // Continue with the error handling middleware
    });
  };
};
