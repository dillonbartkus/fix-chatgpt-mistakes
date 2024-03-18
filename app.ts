import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import routes from './routes/routes';

const app = express();
const port = process.env.PORT || 3001;

// Middleware to parse JSON requests
app.use(bodyParser.json());

app.use('/', routes);

// catch all for any route not handled
app.use('*', (req: Request, res: Response) => {
    res.status(404).json('Page Not Found!')
  })

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});