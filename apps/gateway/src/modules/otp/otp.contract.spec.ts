import * as fs from 'fs';
import * as path from 'path';
import { maskPhone } from './otp.service';

describe('WAgyuu API Contract Fixture Verification', () => {
  const fixturesDir = path.resolve(
    __dirname,
    '../../../../../packages/contracts/fixtures',
  );

  it('matches challenge_queued_response fixture schema', () => {
    const fixturePath = path.join(fixturesDir, 'challenge_queued_response.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    expect(fixture.data).toBeDefined();
    expect(fixture.data.challenge_id).toHaveLength(40);
    expect(fixture.data.challenge_state).toBe('queued');
    expect(fixture.data.ttl_seconds).toBe(300);
    expect(fixture.data.masked_phone).toBe('+62******789');
    expect(fixture.meta).toBeDefined();
    expect(fixture.meta.request_id).toBeDefined();
  });

  it('matches verify_otp_success_response fixture schema', () => {
    const fixturePath = path.join(fixturesDir, 'verify_otp_success_response.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    expect(fixture.data.verification_id).toBeDefined();
    expect(fixture.data.challenge_id).toHaveLength(40);
    expect(fixture.data.purpose).toBe('login');
    expect(fixture.data.phone_e164).toMatch(/^\+[1-9]\d{6,14}$/);
    expect(fixture.data.verified_at).toBeDefined();
    expect(fixture.data.result_expires_at).toBeDefined();
  });

  it('matches verify_otp_invalid_response fixture schema', () => {
    const fixturePath = path.join(fixturesDir, 'verify_otp_invalid_response.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    expect(fixture.error).toBeDefined();
    expect(fixture.error.code).toBe('OTP_INVALID');
    expect(fixture.error.attempts_remaining).toBe(4);
    expect(fixture.error.retryable).toBe(false);
  });
});
