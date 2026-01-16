// Vercel Serverless Function - 代理 GitHub API
const https = require('https');

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
                    
                    res.status(200).json({
                        success: true,
                        plugins: pluginsData.plugins || [],
                        total_count: pluginsData.total_count || 0
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
