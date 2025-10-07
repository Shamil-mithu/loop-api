"use strict";

const { Ticket } = require('@src/models');

async function generateTicketNumber() {
    const digits = '0123456789';

    let ticketNumber = '';
    for (let i = 0; i < 5; i++) {
        ticketNumber += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return ticketNumber;
}

async function generateUniqueTicketNumber() {
    let ticketNumber, existingNumbers;
    do {
        ticketNumber = await generateTicketNumber();
        existingNumbers = await Ticket.find().select({ ticket_number: 1 });
        existingNumbers = existingNumbers.map(ticket => ticket.ticket_number);
    } while (existingNumbers.includes(ticketNumber));
    return ticketNumber;
}

module.exports = generateUniqueTicketNumber;
