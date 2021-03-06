/**
 iZ³ | Izzzio blockchain - https://izzz.io
 BitCoen project - https://bitcoen.io
 @author: Andrey Nedobylsky (admin@twister-vl.ru)
 */


const crypto = require('crypto');

const keypair = require('keypair');
const fs = require('fs');
const CryptoJS = require("crypto-js");
const Transaction = require("./blocks/transaction");
const WalletRegister = require("./blocks/walletRegister");
const moment = require('moment');
const formatToken = require('./formatToken');

const SIGN_TYPE = 'sha256';

/**
 * Wallet object
 * @param walletFile
 * @param {Object} config
 * @returns {{id, block, keysPair: {public,private}, data, balance, addressBook, generate, signData, verifyData, getAddress, setBlock, setWalletFile, save, init, transactions, transact}}
 * @constructor
 */
let Wallet = function (walletFile, config) {

    let wallet = {};

    wallet.walletFile = walletFile;

    if(typeof config === 'undefined') {
        config = {
            precision: 1000000,
        };
    }


    wallet.enableLogging = true;
    wallet.log = function (string) {
        if(wallet.enableLogging) {
            console.log(string);
        }
    };

    /**
     * Wallet id (address)
     */
    wallet.id = '';

    /**
     * Block number, where wallet was defined
     * @type {number}
     */
    wallet.block = -1;

    /**
     * Wallet RSA keys
     */
    wallet.keysPair = {public: '', private: ''};

    /**
     * Another wallet data
     */
    wallet.data = {};

    /**
     * Wallet balance (only for cache)
     */
    wallet.balance = 0.00;

    /**
     * Just list of saved addresses
     */
    wallet.addressBook = {};

    /**
     * Transanctions queue
     * @type {Array}
     */
    wallet.transanctions = [];

    /**
     Кошелёк утверждён блокчейном
     */
    wallet.accepted = false;

    if(typeof walletFile !== 'undefined' && walletFile) {
        try {
            let walletData = JSON.parse(fs.readFileSync(walletFile));
            wallet.id = walletData.id;
            wallet.keysPair = walletData.keysPair;
            wallet.data = walletData.data;
            wallet.balance = walletData.balance;
            wallet.addressBook = walletData.addressBook;
            wallet.block = walletData.block;
            wallet.accepted = walletData.accepted;

        } catch (e) {
            wallet.log('Error: Invalid wallet file!');
        }
    }

    /**
     * Generates new data for wallet
     */
    wallet.generate = function () {
        wallet.keysPair = keypair();
        this.createId();
        wallet.create();
    };

    wallet.createId = function () {
        wallet.id = CryptoJS.SHA256(wallet.keysPair.public).toString();
    };


    if(typeof walletFile === 'undefined') {
        //wallet.generate();
    }

    /**
     * Initialize wallet if not
     * @returns {{}}
     */
    wallet.init = function () {
        if(wallet.id.length === 0) {
            wallet.generate();
        }

        return wallet;
    };


    /**
     * Signs data
     * @param data
     * @param key
     * @returns {{data: *, sign: *}}
     */
    wallet.signData = function (data, key) {
        const sign = crypto.createSign(SIGN_TYPE);
        sign.update(data);
        let signKey = sign.sign(typeof key === 'undefined' ? wallet.keysPair.private : key).toString('hex');
        return {data: data, sign: signKey};
    };

    /**
     * Verify data sign
     * @param data
     * @param sign
     * @param key
     * @returns {boolean}
     */
    wallet.verifyData = function (data, sign, key) {
        if(typeof  data === 'object') {
            sign = data.sign;
            data = data.data;
        }
        const verify = crypto.createVerify(SIGN_TYPE);
        verify.update(data);
        return verify.verify(typeof key === 'undefined' ? wallet.keysPair.public : key, sign, 'hex');
    };

    /**
     * Gets wallet address
     * @param allowTiny
     */
    wallet.getAddress = function (allowTiny) {
        if(wallet.block !== -1 && allowTiny) {
            return 'BL_' + wallet.block;
        }

        return wallet.id + (wallet.block === -1 ? '' : ('_' + wallet.block))
    };

    /**
     * Set wallet define block
     * @param blockId
     */
    wallet.setBlock = function (blockId) {
        if(blockId > 0) {
            wallet.block = Number(blockId);
        }

        return wallet;
    };

    /**
     * Wallet file
     * @param path
     */
    wallet.setWalletFile = function (path) {
        wallet.walletFile = path;

        return wallet;
    };

    /**
     * Write current wallet state to file
     * @returns {boolean}
     */
    wallet.save = function () {
        try {
            fs.writeFileSync(wallet.walletFile, JSON.stringify(wallet))
        } catch (e) {
            return false;
        }

        return true;
    };

    wallet.signBlock = function (unsignedBlock) {
        if(unsignedBlock.isSigned()) {
            return unsignedBlock;
        }
        unsignedBlock.sign = wallet.signData(unsignedBlock.data).sign;
        unsignedBlock.pubkey = wallet.keysPair.public;
        return unsignedBlock;
    };

    /**
     * Создает запрос на регистрацию кошелька
     * @returns {{}}
     */
    wallet.create = function () {
        if(wallet.id.length === 0) {
            wallet.log('Error: Can\'t create empty wallet');
            return false;
        }

        let walletCreateBlock = new WalletRegister(wallet.id);
        walletCreateBlock = wallet.signBlock(walletCreateBlock);
        wallet.transanctions.push(walletCreateBlock);

        return true;
    };

    /**
     * Создает транзакцию
     * @param to ONLY CORRECT WALLET NUMBER!!!
     * @param {Number} amount
     * @param {Number|null} fromTimestamp - transaction activation timestamp in UTC
     * @param {Boolean} keyringed
     */
    wallet.transact = function (to, amount, fromTimestamp, keyringed) {
        to = String(to);
        amount = Number(amount);

        if(wallet.block === -1) {
            wallet.log('Error: Wallet not registered!');
            return false;
        }

        if(wallet.balance < amount && !keyringed) {
            wallet.log('Error: Insufficient funds');
            return false;
        }

        if(!fromTimestamp) {
            fromTimestamp = moment().utc().valueOf();
        }

        let transaction = new Transaction(wallet.id, to, amount, moment().utc().valueOf(), fromTimestamp);
        transaction = wallet.signBlock(transaction);
        wallet.transanctions.push(transaction);

        return true;
    };

    wallet.update = function () {
        wallet.log('Info: Wallet balance: ' + formatToken(wallet.balance, config.precision));
        wallet.save();
    };

    return wallet;
};

module.exports = Wallet;
