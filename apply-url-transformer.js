#!/usr/bin/env node

/**
 * AUTOMATED URL TRANSFORMER APPLICATION SCRIPT
 * 
 * This script systematically adds UrlTransformerService to all services
 * that handle URL fields in responses.
 * 
 * Services to update:
 * 1. organization.service.ts - imageUrl
 * 2. institute-organizations.service.ts - imageUrl
 * 3. lecture.service.ts - liveLink, recordingUrl, docUrl
 * 4. documentation.service.ts - docUrl
 * 5. cause.service.ts - imageUrl, introVideoUrl (DONE)
 */

const services = [
  {
    name: 'OrganizationService',
    file: 'src/organization/organization.service.ts',
    urlFields: ['imageUrl'],
    methods: [
      'createOrganization',
      'getOrganizations',
      'getOrganizationById',
      'updateOrganization',
      'getUserOrganizationsWithDetails'
    ]
  },
  {
    name: 'InstituteOrganizationsService',
    file: 'src/institute-organizations/institute-organizations.service.ts',
    urlFields: ['imageUrl'],
    methods: [
      'createOrganization',
      'getOrganizationsByInstitute',
      'getOrganizationByIdAndInstitute',
      'updateOrganization'
    ]
  },
  {
    name: 'LectureService',
    file: 'src/lecture/lecture.service.ts',
    urlFields: ['liveLink', 'recordingUrl', 'docUrl'],
    methods: [
      'createLecture',
      'getLectures',
      'getLectureById',
      'updateLecture',
      'getLecturesByFilters'
    ]
  },
  {
    name: 'DocumentationService',
    file: 'src/documentation/documentation.service.ts',
    urlFields: ['docUrl', 'pdfUrl'],
    methods: [
      'createDocumentation',
      'getAllDocumentation',
      'getDocumentationById',
      'updateDocumentation'
    ]
  },
  {
    name: 'CauseService',
    file: 'src/cause/cause.service.ts',
    urlFields: ['imageUrl', 'introVideoUrl'],
    status: 'COMPLETE ✅',
    methods: ['getCauseById', 'getCauses']
  }
];

console.log('📋 URL TRANSFORMATION APPLICATION PLAN\n');
console.log('Services to update:', services.length);
console.log('\n');

services.forEach((service, index) => {
  console.log(`${index + 1}. ${service.name}`);
  console.log(`   File: ${service.file}`);
  console.log(`   URL Fields: ${service.urlFields.join(', ')}`);
  console.log(`   Methods: ${service.methods.join(', ')}`);
  console.log(`   Status: ${service.status || 'PENDING'}`);
  console.log('');
});

console.log('\n✅ Next Steps:');
console.log('1. Inject UrlTransformerService in each constructor');
console.log('2. Add transformCommonFields() to all response methods');
console.log('3. Test each service individually');
console.log('4. Build and deploy\n');

module.exports = { services };
