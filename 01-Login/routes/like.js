var express = require('express');
var router = express.Router();

const accessToken = 'test';
const userID = process.env.USER_ID_TO_MONITOR;
const slackURL = process.env.SLACK_INCOMING_WEBHOOK_URL;

const InstagramAPI = require('instagram-api');
const request = require('request');

const instagramAPI = new InstagramAPI(accessToken);

const app = express();

function sendPostToSlack(media) {
  let caption;
  if (media.caption === null) {
    caption = 'Unknown';
  } else {
    caption = media.caption.text;
  }
  request.post(
    slackURL,
    {
      json: {
        attachments: [
          {
            pretext: caption,
            image_url: media.images.standard_resolution.url,
            footer: `Instagram ${media.type} liked`,
            footer_icon: 'https://lh3.googleusercontent.com/aYbdIM1abwyVSUZLDKoE0CDZGRhlkpsaPOg9tNnBktUQYsXflwknnOn2Ge1Yr7rImGk=w300',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      },
    },
    (error, response) => response,
  );
}


app.get('/run', (req, res) => {
  instagramAPI.userMedia(userID).then(
    (result) => {
      const likePromise = [];
      result.data.forEach((media) => {
        const {
          id,
          user_has_liked: userHasLiked,
        } = media;

        if (!userHasLiked) {
          likePromise.push(instagramAPI
            .postMediaLike(id)
            .then(() => sendPostToSlack(media)));
        }
      });

      Promise.all(likePromise).then(
        (values) => {
          res.send(values);
        },
        (err) => {
          res.send(err);
        },
      );
    },
    (err) => {
      res.send(err);
    },
  );
});

module.exports = router;