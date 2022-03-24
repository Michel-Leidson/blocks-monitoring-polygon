require('dotenv').config();
const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;
const Registry = client.Registry;
const register = new Registry();
collectDefaultMetrics({ register });
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');

const express = require('express');

const server = express();
server.use(morgan('dev'));
server.use(bodyParser.urlencoded({ extended: false }));
server.use(bodyParser.json());
server.use(cors());

let validatorsMap = new Map();

const gauge = new client.Gauge({
    name: 'missed_blocks',
    help: 'metric_help',
    labelNames: ['missed_blocks_matic_id','missed_blocks_type'],
    async collect() {
        

        validatorsMap.forEach((value, key)=>{
            
            const validator = key.split(",");
            console.log("Metrics:",validator[0],validator[1],value)
            gauge.labels({ missed_blocks_matic_id: validator[0], missed_blocks_type: validator[1] }).set(value)
        })
    }
});


/**
 * Put metric gauge on register
 */
 register.registerMetric(gauge)

server.post('/blocks/heimdall', async (req, res) => {
    try {
        console.log("Receive Heimdall blocks\n", req.body);
        const { matic_id , type , missed_blocks } = req.body
        validatorsMap.set(`${matic_id},${type}`, missed_blocks);
        res.status(200).send({
            message: "Receive Heimdall blocks"
        })
    } catch (ex) {
        res.status(500).end(ex.message);
        console.log(ex)
    }
});

server.post('/blocks/bor', async (req, res) => {
    try {
        console.log("Receive Bor blocks\n", req.body);
        const { matic_id , type , missed_blocks } = req.body
        validatorsMap.set(`${matic_id},${type}`, missed_blocks);
        res.status(200).send({
            message: "Receive Bor blocks"
        })
    } catch (ex) {
        res.status(500).end(ex.message);
    }
});


/**
 * Endpoint /metrics for Prometheus collect
 */
 server.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (ex) {
        res.status(500).end(ex);
    }
});


const port = process.env.PORT || 9992;


console.log(
    `Server listening to ${port}, metrics exposed on /metrics endpoint`,
);
server.listen(port);