const fs = require('fs');

class OModule {
    constructor(config) {
        let path = 'dict/words.txt';
        let data = fs.readFileSync(path, 'utf8');
        let lines = data.split('\n');
        this.words = new Map();
        for (let i = 0; i < lines.length; i++) {
            let parts = lines[i].split('-');
            let word = parts[0].trim();
            let value = parseFloat(parts[1].trim());
            this.words.set(word, value);
        }
    }
    all() {
        return this.words;
    }
    search(term) {
        let value = this.words.get(term);
        return value !== undefined ? value : 0;
    }
}


let oModule = new OModule();

/**
 * Checks a string for matches in the 'oModule' and returns the highest value found.
 * If a match is found, its value is added to an array. If no matches are found, the function returns false.
 * 
 * @param {string} input - The string to be checked.
 * @returns {number|boolean} - The highest value found, or false if no matches are found.
 */

function checkStringOModule(input) {
    let words = input.split('\n');
    let values = [];
    for (let word of words) {
        let oValue = oModule.search(word.trim()); 
        if (oValue) {
            values.push(oValue);
        }
    }
    if (values.length > 0) {
        let max = Math.max(...values);
        return max;
    } else {
        return false;
    }
}

module.exports = {
    OModule,
    checkStringOModule,
};
