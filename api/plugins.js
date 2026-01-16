// Vercel Serverless Function - 代理 GitHub API（带认证）
// 这样 Token 在服务端，不会暴露给前端

export default async function handler(req, res) {
    // 设置 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    try {
        const GITHUB_API_URL = 'https://api.github.com/repos/VBHC-UHY/whitesalary-plugins/contents/plugins.json';
        
        // 从环境变量读取 Token（在 Vercel 设置中配置）
        const token = process.env.GITHUB_TOKEN;
        
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'WhiteSalary-Plugins-View'
        };
        
        // 如果有 Token，添加认证（5000次/小时）
        if (token) {
            headers['Authorization'] = `token ${token}`;
        }
        
        const response = await fetch(GITHUB_API_URL, { headers });
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        
        const fileInfo = await response.json();
        
        // 解码 base64 内容
        const content = Buffer.from(fileInfo.content, 'base64').toString('utf-8');
        const data = JSON.parse(content);
        
        // 返回插件数据
        res.status(200).json({
            success: true,
            plugins: data.plugins || [],
            total_count: data.total_count || 0,
            last_updated: data.last_updated || null
        });
        
    } catch (error) {
        console.error('Error fetching plugins:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            plugins: []
        });
    }
}

