'use strict';

module.exports = (options, _webpack) => {
  const pdfExternals = {
    '@react-pdf/renderer': 'commonjs @react-pdf/renderer',
    react: 'commonjs react',
  };

  const externals = Array.isArray(options.externals)
    ? [...options.externals, pdfExternals]
    : [options.externals, pdfExternals].filter(Boolean);

  return { ...options, externals };
};
