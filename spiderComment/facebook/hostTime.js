/**
 * Created by dell on 2017/3/20.
 */
const request = require('../../lib/request');
const Utils = require('../../lib/spiderUtils');
const async = require('async');
const req = require('request');

let logger;
class hostTime {
  constructor(spiderCore) {
    this.core = spiderCore;
    this.settings = spiderCore.settings;
    logger = spiderCore.settings.logger;
  }
  todo(task, callback) {
    task.hostTotal = 0;
    task.timeTotal = 0;
    this.videoInfo(task, () => {
      callback();
    });
  }
  videoInfo(task, callback) {
    const option = {
      url: `https://www.facebook.com/ajax/pagelet/generic.php/PhotoViewerInitPagelet?data={'type':'3','source':'12',"v":"${task.aid}","firstLoad":true,"ssid":${new Date().getTime()}}&__user=0&__a=1`,
      ua: 2,
      proxy: 'http://127.0.0.1:56777',
      referer: `https://www.facebook.com/pg/${task.id}/videos/?ref=page_internal`
    };
    let dataJson = null,
      hostname;
    request.get(logger, option, (err, result) => {
      if (err) {
        logger.debug('facebook单个视频信息接口请求失败', err);
        this.getVidInfo(task, callback);
        return;
      }
      try {
        result = result.body.replace(/for \(;;\);/, '').replace(/[\n\r]/g, '');
        result = JSON.parse(result);
      } catch (e) {
        logger.debug('facebook单个视频信息解析失败', result);
        this.getVidInfo(task, callback);
        return;
      }
      dataJson = result.jsmods.require;
      for (let i = 0; i < dataJson.length; i += 1) {
        if (dataJson[i][0] == 'UFIController' && dataJson[i][3][1].ftentidentifier == task.aid) {
          task.cNum = dataJson[i][3][2].feedbacktarget.commentcount;
          hostname = dataJson[i][3][1].permalink.split('/')[1];
        }
      }
      async.series(
        {
          time: (cb) => {
            this.commentInfo(task, hostname, () => {
              cb(null, '最新评论请求完成');
            });
          },
          hot: (cb) => {
            this.getHot(task, hostname, () => {
              cb(null, '热门评论请求完成');
            });
          }
        },
        (error, data) => {
          logger.debug('result:', data);
          callback();
        }
      );
    });
  }
  getHot(task, hostname, callback) {
    let offset = 0,
      cycle = true;
    const option = {
      method: 'POST',
      proxy: 'http://127.0.0.1:56777',
      url: 'https://www.facebook.com/ajax/ufi/comment_fetch.php',
      qs: { dpr: '1' },
      headers:
      {
        'cache-control': 'no-cache',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
        referer: `https//www.facebook.com/${hostname}/videos/vb.${task.bid}/${task.aid}/?type=3&theater`,
        cookie: 'datr=uarsWNHwHCDMME4QegGkXoHN;locale=zh_CN;'
      },
      formData:
      {
        ft_ent_identifier: task.aid,
        offset: 0,
        length: 50,
        orderingmode: 'ranked_threaded',
        feed_context: '{"story_width":230,"is_snowlift":true,"fbfeed_context":true}',
        __user: '0',
        __a: '1',
        __dyn: '7AzHK4GgN1t2u6XolwCCwKAKGzEy4S-C11xG3Kq2i5U4e2O2K48hzlyUrxuE99XyEjKewExmt0gKum4UpyEl-9Dxm5Euz8bo5S9J7wHx61YCBxm9geFUpAypk48uwkpo5y16xCWK547ESubz8-',
        lsd: 'AVpZN3FE'
      }
    };
    async.whilst(
      () => cycle,
      (cb) => {
        option.formData.offset = offset;
        req(option, (error, response, body) => {
          if (error) {
            logger.debug('facebook的评论接口请求失败', error);
            cb();
            return;
          }
          if (response.statusCode != 200) {
            logger.debug('评论状态码错误', response.statusCode);
            cb();
            return;
          }
          try {
            body = body.replace('for (;;);', '').replace(/[\n\r]/g, '');
            body = JSON.parse(body);
          } catch (e) {
            logger.debug('解析失败', body);
            cb();
            return;
          }
          body = body.jsmods.require[0][3][1];
          if (body.comments.length <= 0) {
            cycle = false;
            cb();
            return;
          }
          if (offset >= this.settings.commentTotal) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, body, () => {
            offset += 50;
            cb();
          });
        });
      },
      () => {
        callback();
      }
  );
  }
  commentInfo(task, hostname, callback) {
    let offset = 0,
      cycle = true;
    const option = {
      method: 'POST',
      proxy: 'http://127.0.0.1:56777',
      url: 'https://www.facebook.com/ajax/ufi/comment_fetch.php',
      qs: { dpr: '1' },
      headers:
      {
        'cache-control': 'no-cache',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
        referer: `https//www.facebook.com/${hostname}/videos/vb.${task.bid}/${task.aid}/?type=3&theater`,
        cookie: 'datr=uarsWNHwHCDMME4QegGkXoHN;locale=zh_CN;'
      },
      formData:
      {
        ft_ent_identifier: task.aid,
        offset: 0,
        length: 50,
        orderingmode: 'recent_activity',
        feed_context: '{"story_width":230,"is_snowlift":true,"fbfeed_context":true}',
        __user: '0',
        __a: '1',
        __dyn: '7AzHK4GgN1t2u6XolwCCwKAKGzEy4S-C11xG3Kq2i5U4e2O2K48hzlyUrxuE99XyEjKewExmt0gKum4UpyEl-9Dxm5Euz8bo5S9J7wHx61YCBxm9geFUpAypk48uwkpo5y16xCWK547ESubz8-',
        lsd: 'AVpZN3FE'
      }
    };
    async.whilst(
      () => cycle,
      (cb) => {
        option.formData.offset = offset;
        req(option, (error, response, body) => {
          if (error) {
            logger.debug('facebook的评论接口请求失败', error);
            cb();
            return;
          }
          if (response.statusCode != 200) {
            logger.debug('评论状态码错误', response.statusCode);
            cb();
            return;
          }
          try {
            body = body.replace('for (;;);', '').replace(/[\n\r]/g, '');
            body = JSON.parse(body);
          } catch (e) {
            logger.debug('解析失败', body);
            cb();
            return;
          }
          body = body.jsmods.require[0][3][1];
          if (body.comments.length <= 0) {
            cycle = false;
            cb();
            return;
          }
          if (offset >= this.settings.commentTotal) {
            cycle = false;
            cb();
            return;
          }
          this.deal(task, body, () => {
            offset += 50;
            cb();
          });
        });
      },
      () => {
        callback();
      }
  );
  }
  deal(task, comments, callback) {
    const length = comments.comments.length;
    let index = 0,
      cid,
      comment,
      author;
    async.whilst(
      () => index < length,
      (cb) => {
        cid = comments.comments[index].id;
        author = comments.comments[index].author;
        comment = {
          cid,
          content: Utils.stringHandling(comments.comments[index].body.text),
          platform: task.p,
          bid: task.bid,
          aid: task.aid,
          support: comments.comments[index].likecount,
          reply: comments.commentlists.replies[cid].count,
          c_user: {
            uid: comments.profiles[author].id,
            uname: comments.profiles[author].name,
            uavatar: comments.profiles[author].thumbSrc
          }
        };
        Utils.saveCache(this.core.cache_db, 'comment_update_cache', comment);
        index += 1;
        cb();
      },
      () => {
        callback();
      }
    );
  }
}
module.exports = hostTime;