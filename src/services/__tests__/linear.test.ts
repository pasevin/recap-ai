import { LinearService, LinearConfig, FetchOptions } from '../linear';
import { LinearClient } from '@linear/sdk';

jest.mock('@linear/sdk');

describe('LinearService', () => {
  let service: LinearService;
  let mockClient: jest.Mocked<LinearClient>;

  const mockConfig: LinearConfig = {
    token: 'test-token',
    teamId: 'test-team',
  };

  const mockIssue = {
    id: 'issue-1',
    identifier: 'TEST-123',
    title: 'Test Issue',
    description: 'Test Description',
    priority: 2,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    completedAt: '2024-01-03T00:00:00Z',
    state: jest.fn().mockResolvedValue({ name: 'Done' }),
    assignee: jest.fn().mockResolvedValue({ name: 'John Doe' }),
    creator: jest.fn().mockResolvedValue({ name: 'Jane Smith' }),
    labels: jest
      .fn()
      .mockResolvedValue({ nodes: [{ name: 'bug' }, { name: 'feature' }] }),
    comments: jest.fn().mockResolvedValue({
      nodes: [
        {
          user: { name: 'John Doe' },
          body: 'Test comment',
          createdAt: '2024-01-02T12:00:00Z',
          updatedAt: '2024-01-02T12:00:00Z',
        },
      ],
    }),
  };

  beforeEach(() => {
    mockClient = {
      team: jest.fn().mockResolvedValue({
        name: 'Test Team',
        issues: jest.fn().mockResolvedValue({ nodes: [mockIssue] }),
      }),
    } as unknown as jest.Mocked<LinearClient>;

    (LinearClient as jest.Mock).mockImplementation(() => mockClient);
    service = new LinearService(mockConfig);
  });

  describe('fetchData', () => {
    it('should fetch and transform issues correctly', async () => {
      const options: FetchOptions = {
        state: 'done',
        since: '2024-01-01',
        until: '2024-01-31',
      };

      const result = await service.fetchData(options);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({
        id: 'issue-1',
        identifier: 'TEST-123',
        title: 'Test Issue',
        description: 'Test Description',
        state: 'Done',
        priority: 2,
        assignee: 'John Doe',
        creator: 'Jane Smith',
        labels: ['bug', 'feature'],
      });

      expect(result.summary).toMatchObject({
        totalIssues: 1,
        openIssues: 0,
        closedIssues: 1,
        labels: expect.arrayContaining([
          expect.objectContaining({ name: 'bug' }),
          expect.objectContaining({ name: 'feature' }),
        ]),
      });
    });

    it('should handle missing team ID', async () => {
      service = new LinearService({ token: 'test-token' });
      await expect(service.fetchData()).rejects.toThrow('Team ID is required');
    });

    it('should handle API errors gracefully', async () => {
      mockClient.team = jest.fn().mockRejectedValue(new Error('API Error'));
      await expect(service.fetchData()).rejects.toThrow('API Error');
    });
  });

  describe('filtering and sorting', () => {
    it('should apply filters correctly', async () => {
      const options: FetchOptions = {
        state: 'open',
        priority: 2,
        label: 'bug',
        search: 'test',
      };

      await service.fetchData(options);

      const team = await mockClient.team(mockConfig.teamId!);
      expect(team.issues).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            state: { name: { eq: 'OPEN' } },
            priority: { eq: 2 },
            labels: { name: { eq: 'bug' } },
            OR: [
              { title: { contains: 'test' } },
              { description: { contains: 'test' } },
            ],
          }),
        })
      );
    });

    it('should apply sorting correctly', async () => {
      const options: FetchOptions = {
        sortBy: 'priority',
        sortDirection: 'desc',
        limit: 50,
      };

      await service.fetchData(options);

      const team = await mockClient.team(mockConfig.teamId!);
      expect(team.issues).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { priority: 'DESC' },
          first: 50,
        })
      );
    });
  });

  describe('summary generation', () => {
    it('should calculate time-based metrics correctly', async () => {
      const result = await service.fetchData();

      expect(result.summary.timeStats).toMatchObject({
        avgTimeToFirstResponse: expect.any(String),
        avgCycleTime: expect.any(String),
        issueVelocity: expect.any(Number),
        avgCommentsPerIssue: 1,
        avgLabelsPerIssue: 2,
        completionRate: 100,
      });
    });

    it('should calculate activity patterns correctly', async () => {
      const result = await service.fetchData();

      expect(result.summary.activity).toMatchObject({
        dailyActivity: expect.any(Object),
        weeklyActivity: expect.any(Object),
        peakActivityDay: expect.any(String),
        peakActivityHour: expect.any(Number),
      });
    });

    it('should calculate collaboration metrics correctly', async () => {
      const result = await service.fetchData();

      expect(result.summary.collaboration).toMatchObject({
        uniqueContributors: expect.any(Number),
        avgContributorsPerIssue: expect.any(Number),
        crossTeamCollaboration: expect.any(Number),
      });
    });
  });
});
