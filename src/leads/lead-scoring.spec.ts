import { scoreLead } from './lead-scoring';

describe('scoreLead', () => {
  it('scores a bare inquiry as COLD', () => {
    const result = scoreLead({ email: 'someone@gmail.com' });

    expect(result.band).toBe('COLD');
    expect(result.score).toBeLessThan(45);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('scores a detailed, high-intent business lead as HOT', () => {
    const result = scoreLead({
      email: 'maria@acmecorp.com',
      phone: '+639171234567',
      source: 'Referral from existing client',
      message:
        'We have a monthly budget and are ready to hire an agency for a retainer. Please send a proposal asap, this is urgent for our Q3 launch and we want to book a call.',
    });

    expect(result.band).toBe('HOT');
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('never exceeds 100 or drops below 0', () => {
    const result = scoreLead({
      email: 'ceo@bigbrand.com',
      phone: '+639171234567',
      source: 'referral',
      message: 'budget monthly retainer package contract urgent asap ready hire quote proposal '.repeat(20),
    });

    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
