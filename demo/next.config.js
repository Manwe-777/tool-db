/** @type {import('next').NextConfig} */
const nextConfig = {
    distDir: '.next',
    reactStrictMode: true,
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                crypto: require.resolve('crypto-browserify'),
                stream: require.resolve('stream-browserify'),
                buffer: require.resolve('buffer'),
            };
        }
        return config;
    },
}

module.exports = nextConfig 