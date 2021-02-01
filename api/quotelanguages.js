const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_TOKEN);

module.exports = async (_req, res) => {
    const { data } = await supabase
    .from('quotes')
    .select('language')

    res.setHeader('Access-Control-Allow-Origin', '*');

    let array = [];

    for (const key in data) {
        if (!array.includes(data[key].language)) array.push(data[key].language);
    }

    return res.status(200).send(array);
};