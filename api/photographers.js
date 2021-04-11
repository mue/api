const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_TOKEN);

module.exports = async (_req, res) => {
    const { data } = await supabase
    .from('images')
    .select('photographer');

    let array = [];

    for (const key in data) {
        if (!array.includes(data[key].photographer)) array.push(data[key].photographer);
    }

    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).send(array);
};