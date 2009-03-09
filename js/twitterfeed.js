YUI.add('twitter-feed',function (Y) {

var RE_USERNAME = /@(\w+)/g,
    RE_LINK     = /((?:https?|s?ftp|ssh)\:\/\/[^"\s\<\>]*[^.,;'">\:\s\<\>\)\]\!])/g;

function TwitterFeed() {
    TwitterFeed.superclass.constructor.apply(this,arguments);
}

Y.mix(TwitterFeed, {
    NAME : 'twitterfeed',

    TWITTER_URL : 'http://twitter.com/',

    FEED_URI : 'statuses/user_timeline/',

    ENTRY_TEMPLATE :
    '<div class="twitter-feed-update">'+
        '<p>{text}'+
            '<span class="twitter-feed-timestamp">{relativeTime}</span>'+
        '</p>'+
    '</div>',

    ATTRS : {
        username : {},

        count : {
            value : 10,
            validator : Y.Lang.isNumber
        },

        refreshSeconds : {
            value : 300, // 5mins
            validator : Y.Lang.isNumber
        },

        strings : {
            value : {
                title : 'Latest Updates',
                follow : 'Follow',
                error  : 'Oops!  We had some trouble connecting to Twitter :('
            }
        },

        includeTitle : {
            value : true,
            validator : Y.Lang.isBoolean
        }
    }
});

Y.extend(TwitterFeed, Y.Widget, {

    interval : null,

    renderUI : function () {
        this._renderHeader();
        this._renderBody();
    },

    _renderHeader : function () {
        var cb    = this.get('contentBox'),
            title = cb.query('.twitter-feed-title');

        if (this.get('includeTitle')) {
            if (!title) {
                title = cb.insertBefore(
                    Y.Node.create('<h3 class="twitter-feed-title"></h3>'),
                    cb.get('firstChild'));
            } 

            title.set('innerHTML',this.getString('title'));
        } else if (title) {
            title.get('parentNode').removeChild(title);
        }
    },

    _renderBody : function () {
        var cb   = this.get('contentBox');

        if (!cb.query('ul.twitter-feed-updates')) {
            cb.appendChild(
                Y.Node.create('<ul class="twitter-feed-updates"></ul>'));
        }

        if (!cb.query('a.twitter-feed-follow')) {
            cb.appendChild(
                Y.Node.create('<a class="twitter-feed-follow" '+
                    'href="'+TwitterFeed.TWITTER_URL+'"><span></span></a>'));
        }
    },

    bindUI : function () {
        this.after('usernameChange'      , this.syncUI);
        this.after('countChange'         , this.syncUI);
        this.after('stringsChange'       , this.syncUI);
        this.after('refreshSecondsChange', this._updateInterval);
    },

    syncUI : function () {
        this._uiUpdateTitle();
        this._uiUpdateUserName();
        this.update();

        this._updateInterval();
    },

    _uiUpdateTitle : function () {
        this.get('contentBox').query('.twitter-feed-title').set('innerHTML',
            this.getString('title'));
    },

    _uiUpdateUserName : function () {
        var link = this.get('contentBox').query('.twitter-feed-follow');

        link.set('href', TwitterFeed.TWITTER_URL+this.get('username'));
        link.set('innerHTML',this.getString('follow'));
    },

    update : function () {
        var un      = this.get('username'),
            count   = this.get('count'),
            handler = Y.bind(this._handleJSONPResponse,this),
            url     = TwitterFeed.TWITTER_URL + TwitterFeed.FEED_URI +
                      un + '.json?'+
                      'd=' + (new Date).getTime() + // cache busting needed?
                      '&count=' + this.get('count') +
                      '&callback={callback}';

        Y.jsonp(url,{ success : handler });

    },

    _handleJSONPResponse : function (data) {
        if (Y.Lang.isObject(data)) {
            this._printData(data);
        } else {
            this._printError();
        }
    },

    _printData : function (data) {
        var cb      = this.get('contentBox'),
            entries = this._createEntries(data);

        cb.removeClass('twitter-feed-error');

        cb.query('.twitter-feed-updates').set('innerHTML',
            '<li>'+entries.join('</li><li>')+'</li>');
    },

    _createEntries : function (data) {
        var entries = [], i;

        for (i = data.length - 1; i >= 0; --i) {
            data[i].relativeTime = Y.toRelativeTime(
                // IE's Date.parse can't handle dates formatted as
                // "Tue Feb 03 23:02:18 +0000 2009"
                // but it works without the TZ offset
                new Date(Date.parse(data[i].created_at.replace(/\+\d+/,''))));

            entries[i] = Y.substitute(TwitterFeed.ENTRY_TEMPLATE, data[i])
                        .replace(RE_LINK,'<a href="$1">$1</a>')
                        .replace(RE_USERNAME,
                            '<a class="twitter-acct" href="'+TwitterFeed.TWITTER_URL+'$1">@$1</a>');
        }

        return entries;
    },

    _printError : function () {
        this.get('contentBox').
            addClass('twitter-feed-error').
            set('innerHTML','<li><em>'+this.getString('error')+'</em></li>');
    },

    _updateInterval : function () {
        if (this.interval) {
            this.interval.cancel();
        }

        this.interval = Y.later(
                            this.get('refreshSeconds') * 1000,
                            this, this.update, null, true);
    }
});

Y.TwitterFeed = TwitterFeed;

},'@VERSION@', { requires : ['widget','substitute','io-base','json-parse','relativetime','jsonp'] });
