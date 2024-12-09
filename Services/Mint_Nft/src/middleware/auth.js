const username ='Eerd0T0Q0T27fMZdXXc+vQ==';
const password ='ibpoza59j20AYycgvMPFBIolFhy20h7JVo4LbBTcft4=';

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [reqUsername, reqPassword] = credentials.split(':');

  if (reqUsername !== username || reqPassword !== password) {
    return res.status(403).json({ message: 'Invalid credentials' });
  }
 
  next();
};

module.exports = auth;