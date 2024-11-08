import express from 'express';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';

// Create an Express application
const app = express();

// Middleware setup
app.use(bodyParser.json());

// Define routes
app.post('/email', async (req, res) => {
    console.log(req.body);
    if (!req.body.to || !req.body.subject || !req.body.text || !req.body.html) {
        return res.status(400).json({
            name: 'ValidationError',
            message: 'To, Subject and Text are all required',
            status: 400
        });
    }

    const transporter = nodemailer.createTransport({
        host: '127.0.0.1',
        port: 25,
        secure: false,
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        const emailResult = await transporter.sendMail({
            from: '"OpenReview" <noreply@celestecongrats.fun>',
            to: req.body.to,
            subject: req.body.subject,
            text: req.body.text,
            html: req.body.html
        });
        // sleep for 20 seconds
        await new Promise(resolve => { setTimeout(resolve, 20000); });

        return res.status(200).json({
            name: 'EmailSuccess',
            message: emailResult,
            status: 200
        });
    } catch (error) {
        return res.status(500).json({
            name: 'EmailError',
            message: error,
            status: 500
        });
    }
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
