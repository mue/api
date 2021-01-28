const { createClient } = require('@supabase/supabase-js');
const config = require('../config.json');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_TOKEN);

module.exports = async (req, res) => {
    const { data, error } = await supabase
    .from('quotes')
    .select()
    .eq('language', 'English')
    .eq('id', Math.floor(Math.random() * (config.count.quotes - 1 + 1)) + 1);

    res.setHeader('Access-Control-Allow-Origin', '*');
    
    return res.status(200).send(data[0]);
};