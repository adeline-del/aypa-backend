import bcrypt from 'bcryptjs';
import { IUser } from '../models/User';
import { IBranch } from '../models/Branch';
import { IReport } from '../models/Report';
import { ITask } from '../models/Task';
import { UserRole, getPermissionsForRole } from '../config/permissions';

const defaultPasswordHash = bcrypt.hashSync('password123', 10);

export let inMemoryUsers: (IUser & { passwordHash: string })[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    passwordHash: defaultPasswordHash,
    role: 'youth',
    profileImage: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
    memberSince: '2023-01-15',
    isApproved: true,
    isActive: true,
    dioceseId: 'accra',
    archdeaconryId: 'accra-east',
    branchId: 'st-michael-parish',
    permissions: getPermissionsForRole('youth'),
    tokenVersion: 0,
  },
  {
    id: '2',
    name: 'John Branch Exec',
    email: 'branch_exec@example.com',
    passwordHash: defaultPasswordHash,
    role: 'branch_executive',
    profileImage: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400',
    memberSince: '2021-05-10',
    isApproved: true,
    isActive: true,
    dioceseId: 'accra',
    archdeaconryId: 'accra-east',
    branchId: 'st-michael-parish',
    permissions: getPermissionsForRole('branch_executive'),
    tokenVersion: 0,
  },
  {
    id: '3',
    name: 'Rev. Michael Archdeaconry Exec',
    email: 'arch_exec@example.com',
    passwordHash: defaultPasswordHash,
    role: 'archdeaconry_executive',
    profileImage: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400',
    memberSince: '2020-03-20',
    isApproved: true,
    isActive: true,
    dioceseId: 'accra',
    archdeaconryId: 'accra-east',
    branchId: '',
    permissions: getPermissionsForRole('archdeaconry_executive'),
    tokenVersion: 0,
  },
  {
    id: '4',
    name: 'Diocesan Exec Grace',
    email: 'diocesan_exec@example.com',
    passwordHash: defaultPasswordHash,
    role: 'accra_diocesan_executive',
    profileImage: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400',
    memberSince: '2019-02-14',
    isApproved: true,
    isActive: true,
    dioceseId: 'accra',
    archdeaconryId: '',
    branchId: '',
    permissions: getPermissionsForRole('accra_diocesan_executive'),
    tokenVersion: 0,
  },
  {
    id: '5',
    name: 'Content Editor David',
    email: 'content@example.com',
    passwordHash: defaultPasswordHash,
    role: 'content_manager',
    profileImage: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400',
    memberSince: '2022-08-01',
    isApproved: true,
    isActive: true,
    dioceseId: 'accra',
    permissions: getPermissionsForRole('content_manager'),
    tokenVersion: 0,
  },
  {
    id: '6',
    name: 'System Admin Emmanuel',
    email: 'admin@example.com',
    passwordHash: defaultPasswordHash,
    role: 'admin',
    profileImage: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=400',
    memberSince: '2018-01-01',
    isApproved: true,
    isActive: true,
    dioceseId: 'accra',
    permissions: getPermissionsForRole('admin'),
    tokenVersion: 0,
  },
  {
    id: '7',
    name: 'Super Admin Bishop',
    email: 'superadmin@example.com',
    passwordHash: defaultPasswordHash,
    role: 'super_admin',
    profileImage: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
    memberSince: '2017-01-01',
    isApproved: true,
    isActive: true,
    dioceseId: 'accra',
    permissions: getPermissionsForRole('super_admin'),
    tokenVersion: 0,
  },
  {
    id: '8',
    name: 'Other Branch Exec',
    email: 'other_branch_exec@example.com',
    passwordHash: defaultPasswordHash,
    role: 'branch_executive',
    profileImage: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400',
    memberSince: '2022-01-10',
    isApproved: true,
    isActive: true,
    dioceseId: 'accra',
    archdeaconryId: 'accra-west',
    branchId: 'st-paul-parish',
    permissions: getPermissionsForRole('branch_executive'),
    tokenVersion: 0,
  },
];

export let inMemoryBranches: IBranch[] = [
  {
    id: 'st-michael-parish',
    name: 'St. Michael Parish Branch',
    code: 'STMICHAEL',
    description: 'AYPA St. Michael Branch in Accra East Archdeaconry',
    location: 'Osu, Accra',
    archdeaconryId: 'accra-east',
    dioceseId: 'accra',
    executiveIds: ['2'],
    isActive: true,
  },
  {
    id: 'st-paul-parish',
    name: 'St. Paul Parish Branch',
    code: 'STPAUL',
    description: 'AYPA St. Paul Branch in Accra West Archdeaconry',
    location: 'Dansoman, Accra',
    archdeaconryId: 'accra-west',
    dioceseId: 'accra',
    executiveIds: ['8'],
    isActive: true,
  },
];

export let inMemoryReports: IReport[] = [
  {
    id: 'report-1',
    title: 'St. Michael Q1 Youth Report',
    reportingPeriod: '2026-Q1',
    branchId: 'st-michael-parish',
    archdeaconryId: 'accra-east',
    dioceseId: 'accra',
    submittedBy: '2',
    status: 'draft',
    summary: 'Quarterly activities summary for St. Michael branch.',
    activities: 'Bible study, community cleanup, youth fellowship',
    attendance: 45,
    achievements: 'Increased active member turnout by 20%',
    challenges: 'Resource constraints for transport',
    recommendations: 'Diocesan assistance for outreach materials',
  },
  {
    id: 'report-2',
    title: 'St. Paul Q1 Youth Report',
    reportingPeriod: '2026-Q1',
    branchId: 'st-paul-parish',
    archdeaconryId: 'accra-west',
    dioceseId: 'accra',
    submittedBy: '8',
    status: 'submitted',
    summary: 'Quarterly report for St. Paul branch.',
    activities: 'Youth revival and worship night',
    attendance: 60,
    achievements: 'Successfully organized inter-church choir night',
    challenges: 'Hall capacity limit',
    recommendations: 'Expand venue space',
  },
];

export let inMemoryTasks: ITask[] = [
  {
    id: 'task-1',
    title: 'Organize Accra Diocesan Youth Convention 2026',
    description: 'Plan venue, speaker invitations, and logistics for annual convention.',
    createdBy: '4',
    assignedRole: 'accra_diocesan_executive',
    dioceseId: 'accra',
    priority: 'high',
    status: 'pending',
    dueDate: new Date('2026-11-30'),
  },
  {
    id: 'task-2',
    title: 'Submit St. Michael Annual Youth Census',
    description: 'Compile updated membership data for St. Michael branch.',
    createdBy: '4',
    assignedTo: '2',
    assignedRole: 'branch_executive',
    branchId: 'st-michael-parish',
    archdeaconryId: 'accra-east',
    dioceseId: 'accra',
    priority: 'medium',
    status: 'pending',
    dueDate: new Date('2026-09-15'),
  },
];

export const findMockUserByEmail = (email: string) => {
  const normEmail = email.trim().toLowerCase();
  return inMemoryUsers.find((u) => u.email.toLowerCase() === normEmail);
};

export const findMockUserById = (id: string) => {
  return inMemoryUsers.find((u) => u.id === id);
};

export const addMockUser = (user: IUser & { passwordHash: string }) => {
  inMemoryUsers.push(user);
};
