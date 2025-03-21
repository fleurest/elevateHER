describe('Login and Registration Flow', () => {
    beforeEach(() => {
      cy.visit('/');
    });
  
    it('Register a new user and log in', () => {
      // click on register
      cy.contains('Register an account').click();
      
      // registration form details
      cy.get('input[placeholder="Username"]').type('testuser');
      cy.get('input[placeholder="Password"]').type('testpass');
      cy.contains('Register').click();
      
      // login post registration
      cy.get('input[placeholder="Username"]').type('testuser');
      cy.get('input[placeholder="Password"]').type('testpass');
      cy.contains('Login').click();
  
      // load dashboard check
      cy.url().should('include', '/dashboard');
      cy.contains('Athlete Graph Visualization');
    });
  
    it('Invalid login error shown', () => {
      cy.get('input[placeholder="Username"]').type('wronguser');
      cy.get('input[placeholder="Password"]').type('wrongpass');
      cy.contains('Login').click();
  
      cy.contains('Invalid credentials');
    });
  });