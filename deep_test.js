const http = require('http');

const loginData = JSON.stringify({ email: 'pepe@lasmuñecasderamon.com', password: '123' });

const optionsLogin = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
    }
};

const reqLogin = http.request(optionsLogin, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        try {
            const data = JSON.parse(body);
            if (!data.user?.token) {
                console.log("Login failed:", body);
                return;
            }
            const token = data.user.token;
            console.log("Login success! Fetching services...");

            const optionsServ = {
                hostname: 'localhost',
                port: 3000,
                path: '/api/servicios/user',
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            };

            const reqServ = http.get(optionsServ, (resServ) => {
                console.log("Status:", resServ.statusCode);
                let bodyServ = '';
                resServ.on('data', (d) => bodyServ += d);
                resServ.on('end', () => {
                    console.log("Response Body (start):", bodyServ.substring(0, 100));
                    console.log("Length:", bodyServ.length);
                });
            });
            reqServ.on('error', (e) => console.error("Serv Request Error:", e));
        } catch (e) {
            console.error("Parse Error:", e);
        }
    });
});

reqLogin.on('error', (e) => console.error("Login Request Error:", e));
reqLogin.write(loginData);
reqLogin.end();
