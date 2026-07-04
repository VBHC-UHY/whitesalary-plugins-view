// Vercel Serverless Function - proxy the remote plugin index.
const https = require('https');

const MARKET_SCHEMA_VERSION = 2;
const DEFAULT_ROLES = ['interceptor', 'rewriter', 'tool_provider'];
const DEFAULT_PLATFORMS = ['all'];

function asList(value) {
    if (value === undefined || value === null || value === '') return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        return value.replace(/，/g, ',').split(/[\n,]/).map(v => v.trim()).filter(Boolean);
    }
    return [value];
}

function normalizeDependencies(value) {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value;
    const python = asList(value);
    return python.length ? { python } : {};
}

function normalizePlugin(plugin) {
    return {
        schema_version: MARKET_SCHEMA_VERSION,
        roles: DEFAULT_ROLES,
        platforms: DEFAULT_PLATFORMS,
        permissions: [],
        requires_service: [],
        assets: [],
        dependencies: {},
        ...plugin,
        roles: asList(plugin.roles).length ? asList(plugin.roles) : DEFAULT_ROLES,
        platforms: asList(plugin.platforms).length ? asList(plugin.platforms) : DEFAULT_PLATFORMS,
        permissions: asList(plugin.permissions),
        requires_service: asList(plugin.requires_service || plugin.requires_services),
        assets: asList(plugin.assets),
        dependencies: normalizeDependencies(plugin.dependencies),
    };
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const token = process.env.GITHUB_TOKEN || '';

    const options = {
        hostname: 'api.github.com',
        path: '/repos/VBHC-UHY/whitesalary-plugins/contents/plugins.json',
        method: 'GET',
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'WhiteSalary-Plugins-View',
            ...(token ? { 'Authorization': `token ${token}` } : {})
        }
    };

    return new Promise((resolve) => {
        const request = https.request(options, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                try {
                    const fileInfo = JSON.parse(data);
                    const content = Buffer.from(fileInfo.content, 'base64').toString('utf-8');
                    const pluginsData = JSON.parse(content);
                    const rawPlugins = Array.isArray(pluginsData) ? pluginsData : (pluginsData.plugins || []);
                    const plugins = rawPlugins.filter(Boolean).map(normalizePlugin);

                    res.status(200).json({
                        success: true,
                        schema_version: MARKET_SCHEMA_VERSION,
                        plugins,
                        total_count: plugins.length,
                        last_updated: pluginsData.last_updated || ''
                    });
                } catch (e) {
                    res.status(500).json({ success: false, error: e.message, plugins: [] });
                }
                resolve();
            });
        });

        request.on('error', (e) => {
            res.status(500).json({ success: false, error: e.message, plugins: [] });
            resolve();
        });

        request.end();
    });
};
