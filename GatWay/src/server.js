const express = require('express');
const app = express();
const cors=require('cors');
const path=require('path')
const routes = require('./routes/route');
const sertUpCron=require('./cronjobs');


app.use(express.json());
sertUpCron();
var corsOptions = {
	origin: ["http://localhost:8081","http://localhost:3000",
"https://admin.cyperts.xyz", "https://ttavatar-test.xyz","http://localhost:3000","http://localhost:3001","https://admin.ttavatar-test.xyz","http://207.154.199.190","https://cyperts.xyz","http://localhost:3002"]
};
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use("/Images", express.static(path.join(__dirname, '/Images')));
app.use(routes);

const PORT =8080;
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));


//admin/admin_controller.js/391
