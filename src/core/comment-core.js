const {knex} = require('../util/database').connect();


const newComment = (action) =>  knex('comments').insert({
  user_id: action.client.id,
  feed_item_id: action.feedItemId,
  text: action.text,
})
.catch((err) => {
  if (err.constraint === 'comments_feed_item_id_foreign') {
    const error = new Error('No such feed item id');
    error.status = 404;
    throw error;
  }

  throw err;
});
function deleteComment(id, opts) {
  opts = opts || {};

  return knex('comments')
    .delete()
    .where({
      id: id,
      user_id: knex.raw('(SELECT id from users WHERE uuid = ?)', [opts.client.uuid]),
    })
    .then(deletedCount => {
      if (deletedCount > 1) {
        logger.error('Deleted comment', id, 'client uuid:', opts.client.uuid);
        throw new Error('Unexpected amount of deletes happened: ' + deletedCount);
      }

      return deletedCount;
    });
}

export {
  newComment,
};
