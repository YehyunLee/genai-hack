module.exports = {
  webpack: (config) => {
    config.externals = [...config.externals, 'canvas', 'jsdom'];
    return config;
  },
  api: {
    bodyParser: false,
    responseLimit: '50mb',
  },
}
