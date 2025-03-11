const SAMPLE_RATE = {
    'google': 48000,
    'azure': 16000,
    'witai': 48000,
};

let currentAPI = 'google';

function switchAPI(apiName) {
    if (SAMPLE_RATE[apiName]) {
        currentAPI = apiName;
        console.log(currentAPI);
    } else {
        console.error(`Unknown API: ${apiName}`);
    }
}

function getCurrentSampleRate() {
    return SAMPLE_RATE[currentAPI];
}

module.exports = { switchAPI, getCurrentSampleRate };
