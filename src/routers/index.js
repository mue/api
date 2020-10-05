module.exports = ({ server, config }) => {
    server.get('/', async () => {
        return {
            statusCode: 200,
            message: `API docs: ${config.docs}`
        };
    });
};