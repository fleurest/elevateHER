const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { driver } = require('../neo4j');
const PersonService = require('../services/PersonService');
const PersonModel = require('../models/Person');

const personSvc = new PersonService(PersonModel, driver);

passport.serializeUser((user, done) => {
    done(null, user.email);
});

passport.deserializeUser(async (email, done) => {
    const session = driver.session();
    try {
      const result = await session.run(
        'MATCH (p:Person {email: $email}) RETURN p',
        { email }
      );
      const record = result.records[0];
      if (!record) return done(null, false);
      return done(null, record.get('p').properties);
    } catch (err) {
      done(err);
    } finally {
      await session.close();
    }
  });
  

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const googleId = profile.id;

        let user = await personSvc.findByGoogleId(googleId);

        if (!user) {
            user = await personSvc.findByEmail(email);
            if (user) {
                await personSvc.updateGoogleIdByEmail(email, googleId);
            } else {
              user = await personSvc.createUser({
                email,
                googleId,
                name,
                roles: ['user']
              });
            }
          }
    
          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    ));

module.exports = passport;