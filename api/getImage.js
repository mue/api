const { createClient } = require('@supabase/supabase-js');
const config = require('../config.json');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_TOKEN);

module.exports = async (req, res) => {
    let { data, error } = await supabase
    .from('images')
    .select()
    .filter('id', 'eq', Math.floor(Math.random() * (config.count.images - 1 + 1)) + 1);

    res.setHeader('Access-Control-Allow-Origin', '*');

    data[0].file = config.cdn + data[0].file + '.jpg';

    return res.status(200).send(data[0]);
};