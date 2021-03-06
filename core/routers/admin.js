const router = require('express').Router();

const Category = require('../database/models/Category');
const Topic = require('../database/models/Topic');
const Exercise = require('../database/models/Exercise');

const ROLES = require('../roles');

const allowed = (role, security) => role >= security;

router.route('/').get((req, res) => {
  const { role } = res.locals;
  console.log(role);
  if (allowed(role, ROLES.EDITOR)) res.render('admin/index');
  else res.redirect('/');
});

router.route('/content').get(async (req, res) => {
  const { role } = res.locals;
  if (allowed(role, ROLES.EDITOR)) {
    const _categories = await Category.find();
    const categories = [];

    for (const { id, title } of _categories) {
      const topics = await Topic.find({ parent: id }, null, {
        sort: '-last_changed'
      }).catch(err => functions.handle(err, '/core/routers/admin.js'));

      const exercises = await Exercise.find({ category_id: id }, null, {
        sort: '-last_changed'
      }).catch(err => functions.handle(err, '/core/routers/admin.js'));

      categories.push({
        title,
        id,
        topics,
        exercises
      });
    }

    res.render('admin/content', { categories });
  } else res.redirect('/admin');
});

router.route('/new_topic').post(async (req, res) => {
  const { role } = res.locals;
  if (allowed(role, ROLES.EDITOR)) {
    const { title, id, category } = req.body;

    if (title && id && category)
      await Topic.create({
        title,
        id,
        parent: category,
        last_changed: new Date(),
        data: '# ' + title
      });

    res.redirect('/admin/edit_topic/' + category + '/' + id);
  } else res.redirect('/admin');
});

router.route('/edit_topic/:categoryId*/:topicId*').get(async (req, res) => {
  const { role } = res.locals;
  if (allowed(role, ROLES.EDITOR)) {
    const { categoryId, topicId } = req.params;
    const topic = await Topic.findOne({ parent: categoryId, id: topicId });
    const exercises = await Exercise.find({ category_id: categoryId });

    res.render('admin/edit_topic', { topic, exercises, categoryId });
  } else res.redirect('/admin');
});

router.route('/save_topic/:categoryId*/:topicId*').post(async (req, res) => {
  const { role } = res.locals;
  if (allowed(role, ROLES.EDITOR)) {
    const { categoryId, topicId } = req.params;
    const { title, data } = req.body;
    await Topic.updateOne(
      { parent: categoryId, id: topicId },
      { $set: { title, data, last_changed: new Date() } }
    );
    res.redirect(`/admin/edit_topic/${categoryId}/${topicId}`);
  } else res.redirect('/admin');
});

router.route('/delete_topic/:categoryId*/:topicId*').get(async (req, res) => {
  const { role } = res.locals;
  if (allowed(role, ROLES.MODERATOR)) {
    const { categoryId, topicId } = req.params;
    await Topic.deleteOne({ parent: categoryId, id: topicId });
    res.redirect('/admin/content');
  } else res.redirect('/admin');
});

router.route('/new_exercise').post(async (req, res) => {
  const { role } = res.locals;
  if (allowed(role, ROLES.EDITOR)) {
    const { title, id, category, type } = req.body;

    await Exercise.create({
      title,
      id,
      type,
      category_id: category,
      points: 0,
      published: false,
      last_changed: new Date(),
      created_at: new Date()
    });

    res.redirect('/admin/edit_exercise/' + category + '/' + id);
  } else res.redirect('/admin');
});

router
  .route('/edit_exercise/:categoryId*/:exerciseId*')
  .get(async (req, res) => {
    const { role } = res.locals;
    if (allowed(role, ROLES.EDITOR)) {
      const { categoryId, exerciseId } = req.params;
      const exercise = await Exercise.findOne({
        category_id: categoryId,
        id: exerciseId
      });

      if (exercise.type == 'exercise' || !exercise.type)
        res.render('admin/edit_exercise', { exercise });
      else res.render('admin/edit_quiz', { quiz: exercise });
    } else res.redirect('/admin');
  });

router.route('/save_exercise').post(async (req, res) => {
  const { role } = res.locals;
  if (allowed(role, ROLES.EDITOR)) {
    const { exercise: _exercise } = req.body;
    const exercise = JSON.parse(_exercise);

    const {
      category_id,
      id,
      title,
      variables,
      variants,
      questions,
      points,
      published
    } = exercise;

    await Exercise.updateOne(
      { id, category_id },
      {
        $set: {
          title,
          variables,
          questions,
          variants,
          points,
          published,
          last_changed: new Date()
        }
      }
    );
    res.redirect('/admin/edit_exercise/' + category_id + '/' + id);
  } else res.redirect('/admin');
});

router
  .route('/delete_exercise/:categoryId*/:exerciseId*')
  .get(async (req, res) => {
    const { role } = res.locals;
    if (allowed(role, ROLES.MODERATOR)) {
      const { categoryId, exerciseId } = req.params;
      await Exercise.deleteOne({ category_id: categoryId, id: exerciseId });
      res.redirect('/admin/content');
    } else res.redirect('/admin');
  });

module.exports = router;
