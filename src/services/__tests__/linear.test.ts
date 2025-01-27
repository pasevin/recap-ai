import { LinearService } from '../linear';

describe('LinearService', () => {
  let service: LinearService;

  beforeEach(() => {
    service = new LinearService({ token: 'test-token', teamId: 'test-team' });
  });

  it('should fetch data with default options', async () => {
    await service.fetchData({});
  });

  it('should handle state filter', async () => {
    await service.fetchData({ state: 'open' });
  });

  it('should handle label filter', async () => {
    await service.fetchData({ label: 'bug' });
  });
});
