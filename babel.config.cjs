module.exports = {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            node: 'current', // Targets your current Node.js version
          },
          modules: false, // Transforms ES Modules to CommonJS
        },
      ],
      '@babel/preset-typescript',
      '@babel/preset-react',
    ],
    ignore: [/node_modules\/(?!electron-store)/], // Transpile electron-store
  };
  