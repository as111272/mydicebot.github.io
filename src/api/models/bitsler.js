'use strict';

import {BaseDice} from './base'
import fetch from 'isomorphic-fetch';
import FormData from 'form-data';
import {APIError} from '../errors/APIError'

export class BitslerDice extends BaseDice {
    constructor(){
        super();
        this.url = 'https://www.bitsler.com';
        this.benefit = '?ref=mydicebot'
        this.currencys = ["btc","eth","ltc","doge","dash","bch","xrp","zec","etc","neo","kmd","btg","lsk","dgb","qtum","strat","waves","burst"];
    }

    async login(userName, password, twoFactor ,apiKey, req) {
        let formData = new FormData();
        formData.append('username', userName);
        formData.append('password', password);
        formData.append('api_key', apiKey);
        if(twoFactor) {
            formData.append('twofactor', twoFactor);
        }
        let ret = await this._send('login', 'POST', formData,'');
        req.session.accessToken = ret.access_token;
        req.session.username = userName;
        return true;
    }

    async getUserInfo(req) {
        let formData = new FormData();
        let accessToken = req.session.accessToken;
        formData.append('access_token', accessToken);
        let userinfo = await this._send('getuserstats', 'POST', formData,'');
        let info = req.session.info;
        if(typeof info != 'undefined'){
            return true;
        }
        info = {};
        let currentInfo = userinfo;
        info.info = userinfo;
        req.session.info = info;
        return info;
    }

    async refresh(req) {
        let formData = new FormData();
        let accessToken = req.session.accessToken; 
        formData.append('access_token', accessToken);
        let userinfo = await this._send('getuserstats', 'POST', formData,'');
        let info = req.session.info;
        console.log(info);
        if(!info){
            console.log('info ture');
            return true;
        }
        info.info = userinfo;
        req.session.info = info;
        return info;
    }

    async clear(req) {
        let formData = new FormData();
        let accessToken = req.session.accessToken;
        formData.append('access_token', accessToken);
        let ret = await this._send('getuserstats', 'POST', formData,'');
        let info = {};
        let userinfo = {};
        userinfo.balance = eval("ret."+req.query.currency+"_balance");
        userinfo.profit = eval("ret."+req.query.currency+"_profit");
        userinfo.wagered = eval("ret."+req.query.currency+"_wagered");
        userinfo.bets = ret.bets;
        userinfo.wins = ret.wins;
        userinfo.losses = ret.losses;
        userinfo.success = ret.success;
        info.info = userinfo;
        info.currentInfo = {};
        info.currentInfo.balance = eval("ret."+req.query.currency+"_balance");
        info.currentInfo.bets = 0;
        info.currentInfo.wins = 0;
        info.currentInfo.losses = 0;
        info.currentInfo.profit = 0;
        info.currentInfo.wagered = 0;
        req.session.info = info;
        return info;
    }

    async bet(req) {
        let formData = new FormData();
        let accessToken = req.session.accessToken; 
        let amount = req.body.PayIn/100000000;
        let condition = req.body.High == 1?'>':'<';
        let currency = req.body.Currency.toLowerCase();
        let game = 0;
        if(req.body.High == 1){
            game = 999999-Math.floor((req.body.Chance*10000))+1;
        } else {
            game = Math.floor((req.body.Chance*10000))-1;
        }
        console.log(game);
        formData.append('access_token', accessToken);
        formData.append('type', 'dice');
        formData.append('amount', amount);
        formData.append('condition', condition);
        formData.append('game', game/10000);
        formData.append('devise', currency);
        formData.append('api_key','JNOEF-PTSBI-2MCCP-4PAAJ-GDBMP');
        //formData.append('api_key','0b2edbfe44e98df79665e52896c22987445683e78');
        let ret = await this._send('bet', 'POST', formData,'');
        let info = req.session.info;
        let betInfo = ret;
        betInfo.profit = betInfo.amount_return;
        info.info.bets++;
        info.currentInfo.bets++;
        info.info.profit = parseFloat(info.info.profit) + parseFloat(betInfo.amount_return);
        info.info.balance = betInfo.new_balance;
        info.currentInfo.balance = betInfo.new_balance;
        info.info.wagered = parseFloat(info.info.wagered) + parseFloat(amount);
        info.currentInfo.wagered = parseFloat(info.currentInfo.wagered) + parseFloat(amount);
        info.currentInfo.profit = parseFloat(info.currentInfo.profit) + parseFloat(betInfo.amount_return);
        if(betInfo.amount_return>0){
            betInfo.win = true;
            info.info.wins++;
            info.currentInfo.wins++;
        } else {
            betInfo.win = false;
            info.info.losses++;
            info.currentInfo.losses++;
        }
        let returnInfo = {};
        returnInfo.betInfo= betInfo;
        returnInfo.info = info;
        req.session.info = info;
        console.log(returnInfo);
        return returnInfo;
    }

    async _send(route, method, body, accessToken){
        let url = `${this.url}/api/${route}${this.benefit}`;
        let res = await fetch(url, {
            method,
            headers: {
                'User-Agent': 'DiceBot',
            },
            body: body,
        });
        let data = await res.json();
        if (data.return.success == 'false') {
            throw new APIError(data.return.value,data.return);
        }
        return data.return;
    }
}
