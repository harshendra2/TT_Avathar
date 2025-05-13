const cron = require('node-cron');
const fs = require('fs');
const path=require('path');

const LOG_FILE = "/root/backendlogs/cron_test.log";

const ensureDirectoryExists = (filePath) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

function logMessage(message) {
    ensureDirectoryExists(LOG_FILE);
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const logEntry = `${timestamp} - ${message}\n`;
    fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
}

// Call the function and handle the response
async function callStoreTeamStatistics() {
    try {
        // Define the base URL and parameters
        const baseUrl = 'http://localhost:8080/api/partneractivity/storeteamstatistics';
        const params = new URLSearchParams({ flag: true });

        // Construct the full URL with parameters
        const fullUrl = `${baseUrl}?${params.toString()}`;
        const response = await fetch(fullUrl, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
         console.log("APPus Store activy hitting");
        const data = await response.json();
        logMessage('Success: Received HTTP 200 for store team statistics.');

    } catch (error) {
        logMessage(`Error: ${error.message}`);
    }
}


async function callUserRank() {
    try {
        // Define the base URL and parameters
        const baseUrl = 'http://localhost:8080/api/partneractivity/updateUserRank';
        const params = new URLSearchParams({});

        // Construct the full URL with parameters
        const fullUrl = `${baseUrl}?${params.toString()}`;
        const response = await fetch(fullUrl, {
            method: 'GET',
            mode: 'cors', 
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        console.log("APPus Update user rank activy hitting");
        const data = await response.json();
        logMessage('Success: Received HTTP 200 for update user rank.');

    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
        logMessage(`Error: ${error.message}`);
    }
}


async function UserReward() {
    try {
        const baseUrl = 'http://localhost:8080/api/admin/update/Unclaimed/reward';
        // Construct the full URL with parameters
        const fullUrl = `${baseUrl}`;
        const response = await fetch(fullUrl, {
            method: 'PUT',
            mode: 'cors', 
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        logMessage('Success: Received HTTP 200 for update user rank.');

    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
        logMessage(`Error: ${error.message}`);
    }
}




const setupCronJobs =async () => {
    cron.schedule('*/5 * * * *', async () => {
        try {
            //  await Promise.all([callStoreTeamStatistics(), callUserRank()]);
            // logMessage('Running task every 5 minutes');
        } catch (error) {
            console.error('Error executing scheduled task:', error);
            logMessage(`Error executing scheduled task: ${error.message}`);
        } finally {
            logMessage('Script ended');
        }
    });

    cron.schedule('0 0 * * *',async() => {
        try {
            await UserReward()
        } catch (error) {
            logMessage(`Error executing scheduled task: ${error.message}`);
        } finally {
            logMessage('Script ended');
        }
    });
};

module.exports = setupCronJobs;
