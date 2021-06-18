const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_TOKEN);

module.exports = async (req, res) => {
    const { data } = await supabase
    .from('quotes')
    .select()
    .eq('language', req.query.language.replace('French', 'Français') || 'English');

    const random = data[Math.floor(Math.random() * data.length)];

    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).send(random);
};
