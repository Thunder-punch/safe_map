const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  /* config options here */
};

module.exports = withPWA(nextConfig);
