import express from 'express';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { check, param, validationResult } from 'express-validator';

import DB from "./db.js";

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy8yBKM7qsdM/NhsUpjPPw
FuhYxTTUmWddJ0J5pIpgVBnFuSBFkTk3AzvYJrFLaHjOahEbs6/WaRuR2TOgbtJi1
SEcwNk/mArwGpeTzOGo3g6chiy4ScmEtHTK5+18Mz5+NDhQ6S23joDm6zpQLM2yoN
IUDMCPctlb3IiuZl2LKqOCdqCiBExORGKkDKlU8UH5hTSc+C8sp0EOx/xoN0UoWVF
jd74fu30Vvw4tS0QomUN19L0VMrS14HmOFbJQaEMGIWmP2hJhGjFd8GTqQmN6OJze
M3cG/VdYfAyeY9yBMxtGTkSvuqVH2NIEPnACtHU3IfGpRCk7GsQ9fJc4BB6yQIDAQAB
-----END PUBLIC KEY-----`;

const KEYCLOAK_TOKEN_URL = "https://keycloak.gawron.cloud/realms/webentwicklung/protocol/openid-connect/token";
const CLIENT_AUTHORIZATION = "Basic dG9kby1iYWNrZW5kOjFWTlRsQ3ZzaHJjWkQ0Zm0wZUpqVE9QZWN2d210M0x5";

const db = new DB();
await db.connect();

/** Zentrales Objekt für unsere Express-Applikation */
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

const jwtFromRequest = (req) => {
    let token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token && req.cookies?.token) {
        token = req.cookies.token;
    }
    return token;
};

const todoValidationRules = [
    check('title')
        .isString()
        .notEmpty()
        .withMessage('Titel darf nicht leer sein')
        .isLength({ min: 3 })
        .withMessage('Titel muss mindestens 3 Zeichen lang sein'),

    check('due')
        .optional({ checkFalsy: true })
        .isISO8601()
        .withMessage('Ungültiges Datum'),

    check('location')
        .optional()
        .isString(),

    check('status')
        .isIn([
            'needs-action',
            'completed',
            'in-process',
            'cancelled'
        ])
        .withMessage('Ungültiger Status'),

    check('id')
        .optional()
        .custom((value, { req }) => {
            if (value !== req.params.id) {
                throw new Error('ID in URL and body must match');
            }
        })
];

const deleteValidationRules = [
    param('id')
        .notEmpty()
        .withMessage('ID erforderlich')
        // Optional: Prüfen ob es ein gültiges MongoDB ObjectId-Format ist
        .isMongoId()
        .withMessage('Ungültige ID')
];

passport.use(new JwtStrategy({
    jwtFromRequest,
    secretOrKey: PUBLIC_KEY,
    algorithms: ['RS256']
}, (payload, done) => {
    return done(null, payload);
}));

const auth = passport.authenticate('jwt', { session: false });

// only used for testing
app.use(express.urlencoded({ extended: false }));

app.use(express.static("../frontend"));

const buildRedirectUri = () => {
    const codespaceName = process.env.CODESPACE_NAME;
    if (!codespaceName) {
        throw new Error('CODESPACE_NAME is required for the redirect URI in this deployment');
    }
    return `https://${codespaceName}-3000.app.github.dev/oauth_callback`;
};

app.get('/oauth_callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send('Missing authorization code');
    }

    const redirect_uri = buildRedirectUri();
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        client_id: 'todo-backend'
    });

    const tokenResponse = await fetch(KEYCLOAK_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': CLIENT_AUTHORIZATION
        },
        body
    });

    if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        return res.status(502).send(`Token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const jwt = tokenData.access_token;
    if (!jwt) {
        return res.status(502).send('No access token returned from Keycloak');
    }

    res.cookie('token', jwt, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
    });
    res.redirect('/');
});

app.get('/todos', auth, async (req, res) => {
    const userId = req.user.sub;
    res.json(await db.queryAll(userId));
});

app.post('/todos', todoValidationRules, auth, async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }
    
    const userId = req.user.sub;
    res.status(201).json(await db.insert(req.body, userId));
})

app.get('/todos/:id', todoValidationRules, auth, async(req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    const id = req.params.id;
    const userId = req.user.sub;
    const todo = await db.queryById(id, userId);
    if (todo) {
        res.json(todo);
    } else {
        res.status(403).send();
    }
})

app.delete('/todos/:id', deleteValidationRules, auth, async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    const id = req.params.id;
    const userId = req.user.sub;
    if (id) {
        const result = await db.delete(id, userId);
        if (result) {
            res.status(201).json(result);
        } else {
            res.status(403).send();
        }
    } else {
        res.status(404).send();
    }
})

app.put('/todos/:id', todoValidationRules, auth, async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    const id = req.params.id;
    const userId = req.user.sub;
    if (id) {
        const result = await db.update(id, req.body, userId);
        if (result.value) {
            res.status(201).json(result.value);
        } else {
            res.status(403).send();
        }
    } else {
        res.status(404).send();
    }})

app.listen(3000);