const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_TOKEN);

module.exports = async (_req, res) => {
    const { data } = await supabase
    .from('images')
    .select();

    const random = data[Math.floor(Math.random() * data.length)];
    random.file = process.env.CDN_URL + random.file + '.jpg';

    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).send(random);
};