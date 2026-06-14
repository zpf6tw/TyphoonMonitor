import teamData from '../../data/team.json';

export type AdvisorProfile = {
  name: string;
  title: string;
  school: string;
  research: string;
  bio: string;
};

export type FacultyMember = {
  name: string;
  title: string;
  research?: string;
};

export type StudentMember = {
  name: string;
  research?: string;
  year: string;
  note?: string;
};

type TeamData = {
  advisorProfile: AdvisorProfile;
  facultyMembers: FacultyMember[];
  phdStudents: StudentMember[];
  masterStudents: StudentMember[];
};

const typedTeamData = teamData as TeamData;

const memberPhotoModules = import.meta.glob('../../assets/lab/members/*.{jpg,jpeg,png}', {
  eager: true,
  import: 'default',
  query: '?url',
});

const memberPhotos = Object.fromEntries(
  Object.entries(memberPhotoModules).map(([path, src]) => {
    const fileName = path.split('/').pop() || '';
    const name = fileName.replace(/\.[^.]+$/, '');
    return [name, src as string];
  })
) as Record<string, string>;

export const getMemberPhoto = (name: string) => {
  return memberPhotos[name.trim()] || '';
};

export const advisorProfile = typedTeamData.advisorProfile;
export const facultyMembers = typedTeamData.facultyMembers;
export const phdStudents = typedTeamData.phdStudents;
export const masterStudents = typedTeamData.masterStudents;
