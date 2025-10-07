const moment = require('moment/moment');

function template(currentTime) {
    let logo = ""; // Assuming you have a logo variable to be inserted
    let year = moment().format("YYYY");

    return `<!DOCTYPE html>
    <html>
    <head>
        <style>
        /* CSS styles */
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #fff;
            margin: 0;
            padding: 0;
            background-color: #0e0712;
        }
        .container {
            margin: 0 auto;
            padding: 80px 20px;
            background-color: #0e0712;
            text-align: center;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .content {
            background-color: #15101a;
            padding: 40px 20px;
            border-radius: 5px;
            max-width: 600px;
            margin: auto;
        }
        .content a {
            padding: 10px 20px;
            font-weight: 600;
            border-bottom: none;
            letter-spacing: .2px;
            color: #fff!important;
            background: linear-gradient(90deg, #dc8c1f 1%, #c825ab);
            font-size: 15px;
            color: #fff;
            border-radius: 0.3rem;
            text-decoration: none;
            margin: 10px 0;
            display: inline-block;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            color: #777777;
            font-size: 14px;
        }
        h1 {
            margin: 0;
            color: #fff;
        }
        p {
           margin: 20px 0;
           color: #fff;
        }
        @media screen and (max-width: 575px){
            .header img{
                max-width: 100%;
                height: auto;
            }
            h1 {
                font-size: 20px;
            }
        }        
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://i.ibb.co/w0MKHfd/1.png" class="main-logo" alt="logo">
            </div>
            <div class="content">
                <h1>Welcome Aboard!</h1>
                <p>Congratulations! You've successfully registered your account at ${currentTime}.</p>
                <p>We're excited to have you with us. If you have any questions, feel free to reach out.</p>
                <p>Thank you for joining us.</p>
            </div>
        </div>
    </body>
    </html>`;
}

module.exports = { template };
