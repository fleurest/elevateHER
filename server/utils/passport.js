const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { driver } = require('../neo4j');

passport.serializeUser((user, done) => {
    done(null, user.email);
});
passport.deserializeUser(async (email, done) => {
    try {
        const session = driver.session();
        const result = await session.run(
            'MATCH (p:Person {email: $email}) RETURN p',
            { email }
        );
        session.close();
        const record = result.records[0];
        done(null, record?.get('p').properties || null);
    } catch (err) {
        done(err);
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

        const session = driver.session();
        await session.run(
            `MERGE (p:Person {email: $email})
       ON CREATE SET p.name = $name, p.roles = ['user']
       RETURN p`,
            { email, name }
        );
        session.close();
        done(null, { email, name });
    } catch (err) {
        done(err);
    }
}));

module.exports = passport;