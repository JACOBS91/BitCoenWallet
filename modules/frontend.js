/**
 iZ³ | Izzzio blockchain - https://izzz.io
 BitCoen project - https://bitcoen.io
 @author: Andrey Nedobylsky (admin@twister-vl.ru)
 */

const express = require("express");

/**
 * Wallet and RPC interface
 *
 */
class Frontend {
    constructor(wallet, blockchain, transactor, blockHandler, app, blockchainObject, options, getLastBlock, getSomeInfo, transact, hardResync) {
        let that = this;
        this.app = app;
        this.wallet = wallet;
        this.blockchain = blockchain;
        this.transactor = transactor;
        this.getLastBlock = getLastBlock;
        this.getSomeInfo = getSomeInfo;
        this.blockHandler = blockHandler;
        this.transact = transact;
        this.hardResync = hardResync;
        this.options = options;
        this.blockchainObject = blockchainObject;

        app.use(express.static('frontend'));
        //app.get('/', this.index);
        app.get('/getInfo', function (req, res) {
            that.getInfo(req, res)
        });
        app.get('/getTransactions', function (req, res) {
            that.getTransactions(req, res)
        });

        app.get('/getWalletInfo/:id', function (req, res) {
            that.getWalletInfo(req, res)
        });

        app.post('/createTransaction', function (req, res) {
            that.createTransaction(req, res)
        });

        app.post('/resyncBlockchain', function (req, res) {
            that.resyncBlockchain(req, res)
        });

        app.post('/resyncAll', function (req, res) {
            that.resyncAll(req, res)
        });

        app.get('/downloadWallet', function (req, res) {
            that.downloadWallet(req, res)
        });
    }

    index(req, res) {
        res.send('Shalom');
    }

    getInfo(req, res) {
        let that = this;
        let data = {
            balance: that.wallet.balance,
            address: that.wallet.getAddress(false),
            tiny: that.wallet.getAddress(true)
        };

        that.getSomeInfo(function (miners, minerForce, peers) {
            that.getLastBlock(function (block, maxBlock) {
                data.block = block;
                data.maxBlock = maxBlock;
                data.miners = miners;
                data.minerForce = minerForce;
                data.peers = peers;
                data.syncInProgress = that.blockHandler.syncInProgress;
                data.options = that.options;
                let wallet = JSON.parse(JSON.stringify(that.wallet));
                delete wallet.keysPair;
                data.wallet = wallet;
                res.send(data);
            });
        });

    }

    getTransactions(req, res) {
        let that = this;
        res.send(that.blockHandler.ourWalletBlocks);
    }

    getWalletInfo(req, res) {
        let that = this;
        that.blockHandler.getWallet(req.params.id, function (wallet) {
            res.send(JSON.parse(wallet));
        });

    }

    createTransaction(req, res) {
        let that = this;
        res.send(that.transact(req.body.id, Number(req.body.amount), Number(req.body.fromTimestamp)));
    }

    resyncBlockchain(req, res) {
        let that = this;
        that.blockHandler.resync();
        res.send();
    }

    downloadWallet(req, res) {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="wallet.json"'
        });
        res.write(JSON.stringify(this.wallet));

        res.end();
    }

    resyncAll(req, res) {
        let that = this;
        that.hardResync();
        res.send();
    }
}

module.exports = Frontend;
