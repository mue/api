const config = require('../config.json');

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_TOKEN);

const rateLimit = require('lambda-rate-limiter')({
    interval: config.ratelimit_time * 1000
}).check;

module.exports = async (req, res) => {
    try {
        await rateLimit(50, req.headers['x-real-ip']);
    } catch (error) {
        return res.status(429).send({ message: 'Too many requests' });
    }

    const { data } = await supabase
    .from('quotes')
    .select('language');

    let array = [];

    data.forEach((key) => {
        if (!array.includes(data[key].language)) {
            array.push(data[key].language);
        }
    });

    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).send(array);
};