const { dbHost } = require('./../constants/defaults');
const cron = require('node-cron');
const axios = require('axios');
const moment = require('moment');
const { scrapper } = require('./scraping-handler');
const { jobStatusUpadate, stopJob } = require('./../utils/handlers');
const { watchProducts } = require('./request-handler');
const ip = require("ip");
const address = ip.address();
const timeForAProduct = 8; // in sec [assumption on page processing time]
const waitTimeForNextJob = 0; // in minutes
const jobRunTypes = [
    {
        schedule: '0 1 * * *',
        mode: 'Everyday'
    },
    {
        schedule: '0 0 * * 1',
        mode: 'Once in a Week'
    },
    {
        schedule: '0 0 * 1 *',
        mode: 'Once in a Month'
    },
    {
        schedule: '0 0 * * 1,4',
        mode: 'Twice in a Week'
    },
    {
        schedule: '0 0 * 1, 15 *',
        mode: 'Twice in a Month'
    }
]
let jobStartedAt;
// ['Everyday', 'Once in a Week', 'Once in a Month', 'Twice in a Week', 'Twice in a Month'];
const job = async () => {
    // testCron();
    // return;
    let jobs = await axios.get(`${dbHost}job/all`).then(async (res) => {
        return res.data.data;
    });
    if (jobStartedAt && moment().diff(moment(jobStartedAt), 'days') === 0) {

    } else {
        jobs = jobs.filter(j => (j.status && j.status !== 'Scheduled' && j.interval !== 'Now'));
    }
    jobs = jobs.map(j => {
        const definedJob = jobRunTypes.find(jr => jr.mode === j.interval);
        if (definedJob && j.recursive) {
            j.runAt = definedJob.schedule;
        } else {
            j.runAt = '0 1 * * *';
            j.destroy = true;
        }
        return j;
    });
    console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Scheduler Running!~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    scheduleJob(jobs);

    // console.log('Triggered Job Completed');
}

const getConfig = async () => {
    return axios.get(`${dbHost}configuration/all`).then(async (res) => {
        return res.data.data;
    });
}

const getUserConfig = async () => {
    return axios.get(`${dbHost}configuration/user/all`).then(async (res) => {
        return res.data.data;
    });
}

processingTime = (ms) => {
    var minutes = Math.floor(ms / 60000);
    var seconds = ((ms % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}


const runScrapper = async (sJob) => {
    const { category, subCategory, subCategory1, scheduleId, _id } = sJob;
    const startTime = new Date().getTime();
    const status = 'Scheduled';
    jobStatusUpadate({ _id, scheduleId, status, address }, 0);
    const config = await getConfig();
    sJob.config = config;
    const { host, active } = config;
    if (active && host) {
        // console.log(`${sJob.runAt} - ${sJob.interval}`);
        console.log(`running a task --> ${sJob.interval}`);
        let url = `${host}/s?bbn=${category.nId}&rh=n:${category.nId},n:${subCategory.nId}`;
        if (subCategory1 && !subCategory1.node) {
            url = `${url},n:${subCategory1.nId}`;
        }
        if (subCategory1 && subCategory1.node) {
            url = `${host}/s?node=${subCategory1.node}`;
        }
        url = `${url}&ref=lp_${category.nId}_sar&fs=true`;
        sJob.url = url;
        const jobDone = await scrapper(sJob);
        if (sJob.interval === 'Now' && !sJob.recursive) {
            await stopJob(sJob);
        }
        const endTime = new Date().getTime();
        const computedTime = endTime - startTime;
        const time = processingTime(computedTime);
        console.log(`${time} <-- Time took to Completed task --> ${sJob.scheduleId}`);
        return jobDone;
    } else {
        console.log(`suspending task --> ${sJob.scheduleId}`);
        // return;
    }

}

const scheduleJob = async (jobs) => {
    async function jobLoop() {
        console.log('Looping Through scheduled Jobs.')
        const noOfjobs = jobs.length;
        for (let index = 0; index < noOfjobs; index++) {
            const sJob = jobs[index];
            if (sJob.interval === 'Everyday') {
                sJob.to = sJob.to ? Number(sJob.to) : 1000;
                sJob.from = sJob.from ? Number(sJob.from) : 0;
                waitTimeForNextJob = + (sJob.to - sJob.from * timeForAProduct) / 60;
                if (index) {
                    const hour = Math.floor(waitTimeForNextJob / 60);
                    const minutes = waitTimeForNextJob % 60;
                    sJob.runAt = `${minutes + 2} ${hour} * * *`;
                }
            }
            if (sJob.interval !== 'Now' && sJob.status === 'New') {
                var jobSchedule = cron.schedule(sJob.runAt, async (e) => {
                    await runScrapper(sJob);
                    if (sJob.destroy) {
                        jobSchedule.destroy();
                    }
                });
            } else {
                await runScrapper(sJob);
            }
        }
    }
    await jobLoop();
    return true;
}

const testCron = async () => {
    console.log('Testing Cron');
    let jobs = await axios.get(`${dbHost}job/all`).then(async (res) => {
        return res.data.data;
    });
    jobs = jobs.map(j => {
        j.runAt = '* * * * *';
        j.destroy = true;
        return j;
    })
    console.log('TESTING~~~~~~~~~~~~~~~~~~~~~~Scheduler Running!~~~~~~~~~~~~~~~~~~~~~~TESTING');
    scheduleJob(jobs);
}

const startJobs = () => {
    // job();
    // return;
    immediate();
    watch();
    jobStartedAt = moment().format();
    new cron.schedule('0 0 0 * * *', function () {
        console.log(`Scheduler running from - ${jobStartedAt}`);
        console.log(`Schedule Initiated Today! - ${moment().format()}`);
        job();
    });
}

const immediate = () => {
    new cron.schedule('* * * * *', async () => {
        let jobs = await axios.get(`${dbHost}job/all?interval=Now`).then(async (res) => {
            return res.data.data;
        });
        const newJob = jobs.find(j => j.status === 'New');
        const isRunningScheduled = jobs.find(j => (j.status === 'Running' || j.status === 'Scheduled') && j.address === address);
        if (!isRunningScheduled && newJob) {
            console.log(`Scheduler running from - ${jobStartedAt}`);
            console.log(`on Demand Schedule Initiated! - ${moment().format()}`);
            console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Instant Schedule Running!~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
            scheduleJob([newJob]);
        }
    });
}

const watch = async () => {
    const config = await getUserConfig();
    const { active, priceStockInteval } = config;
    if (active) {
        const runAt = priceStockInteval;
        // const runAt = '21 17 * * *';
        new cron.schedule(runAt, function () {
            console.log(`Watch Price Stock Tasks running`);
            console.log(`Watch Price Stock Initiated Today! - ${moment().format()}`);
            watchProducts(config);
        });
    }
}

module.exports = { startJobs, immediate, watch };
