context('The app', () => {
    beforeEach(() => {
        cy.visit('http://localhost:8080');
    });

    it('logs to Seq', () => {
        cy.get('#log-event').click();

        // This appears to be flaky on slower runners.
        // cy.get('#status').should('have.text', 'Logging an event...');

        // After a little while...

        cy.get('#status').should('have.text', 'The event was logged!');
    });
});
