import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { ReclamationsAdminComponent } from './components/reclamations-admin/reclamations-admin.component';
import { SignupComponent } from "./template/dashboards/auth/signup/signup.component";
import { SigninComponent } from "./template/dashboards/auth/signin/signin.component";
import { ForgotPasswordComponent } from "./template/dashboards/auth/forgot-password/forgot-password.component";
import { ForgotPasswordVerifyComponent } from "./template/dashboards/auth/forgot-password-verify/forgot-password-verify.component";
import { ForgotPasswordResetComponent } from "./template/dashboards/auth/forgot-password-reset/forgot-password-reset.component";
import { LoginVerifyComponent } from "./components/login-verify/login-verify.component";

import { DashboardComponent } from "./components/dashboard/dashboard.component";
import { DashboardVisiteurComponent } from "./components/dashboard-visiteur/dashboard-visiteur.component";
import { ListingUsersComponent } from "./components/listing-users/listing-users.component";
import { ListingInterventionsComponent } from "./components/listing-interventions/listing-interventions.component";
import { ListingServicesComponent } from "./components/listing-services/listing-services.component";
import { ListingFournisseursComponent } from "./components/listing-fournisseurs/listing-fournisseurs.component";
import { ListingOrdersComponent } from "./components/listing-orders/listing-orders.component";
import { CreateUserComponent } from "./components/create-user/create-user.component";
import { UserProfileComponent } from "./components/user-profile/user-profile.component";
import { NotificationsComponent } from "./template/dashboards/others/notifications/notifications.component";
import { MesInterventionsComponent } from "./components/mes-interventions/mes-interventions.component";
import { CreateServiceComponent } from "./components/create-service/create-service.component";
import { CreateFournisseurComponent } from "./components/create-fournisseur/create-fournisseur.component";
import { CreateOrderComponent } from "./components/create-order/create-order.component";
import { CreateInterventionComponent } from "./components/create-intervention/create-intervention.component";
import { InterventionDetailsComponent } from "./components/intervention-details/intervention-details.component";
import { CreateOrderInterventionComponent } from "./components/create-order-intervention/create-order-intervention.component";
import { AuthGuard } from "./guards/auth.guard";
import { RoleGuard } from "./guards/role.guard";
import { ReclamationComponent } from "./components/reclamation/reclamation.component";
import { MesDemandesComponent } from "./components/mes-demandes/mes-demandes.component";
import { QrCodeComponent } from "./pages/qr-code/qr-code.component";
import { ReclamationPublicComponent } from "./pages/reclamation-public/reclamation-public.component";
import { SuiviReclamationComponent } from "./pages/suivi-reclamation/suivi-reclamation.component";


const routes: Routes = [
 
  { path: "", redirectTo: "/auth/signin", pathMatch: "full" },
  { path: "login", redirectTo: "/auth/signin", pathMatch: "full" },
  { path: "reclamation", component: ReclamationComponent, canActivate: [AuthGuard] },
  {
  path: "reclamations",
  component: ReclamationsAdminComponent,
  canActivate: [AuthGuard, RoleGuard],
  data: { adminsOnly: true }
},

  {
    path: "dashboard",
    component: DashboardComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { adminsOnly: true },
  },
  {
    path: "dashboard-visiteur",
    component: DashboardVisiteurComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { nonAdminOnly: true },
  },
  {
    path: "users",
    component: ListingUsersComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { adminsOnly: true },
  },
  {
    path: "interventions",
    component: ListingInterventionsComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { adminsOnly: true },
  },
  {
    path: "mes-interventions",
    component: MesInterventionsComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { techniciansOnly: true },
  },
  {
    path: "dashboard-client",
    component: DashboardVisiteurComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { techniciansOnly: true },
  },
  { path: "intervention/:id", component: InterventionDetailsComponent, canActivate: [AuthGuard] },
  {
    path: "services",
    component: ListingServicesComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { adminsOnly: true },
  },
  {
    path: "fournisseurs",
    component: ListingFournisseursComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { adminsOnly: true },
  },
  { path: "commandes", component: ListingOrdersComponent, canActivate: [AuthGuard] },
  {
    path: "create-user",
    component: CreateUserComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { adminsOnly: true },
  },
  {
    path: "create-user/:id",
    component: CreateUserComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { adminsOnly: true },
  },
  { path: "create-intervention", component: CreateInterventionComponent, canActivate: [AuthGuard] },
  { path: "create-service", component: CreateServiceComponent, canActivate: [AuthGuard] },
  { path: "create-service/:id", component: CreateServiceComponent, canActivate: [AuthGuard] },
  { path: "create-fournisseur", component: CreateFournisseurComponent, canActivate: [AuthGuard] },
  { path: "create-fournisseur/:id", component: CreateFournisseurComponent, canActivate: [AuthGuard] },
  { path: "create-order", component: CreateOrderComponent, canActivate: [AuthGuard] },
  { path: "create-order/:id", component: CreateOrderComponent, canActivate: [AuthGuard] },
  { path: "create-order-intervention/:id", component: CreateOrderInterventionComponent, canActivate: [AuthGuard] },
  { path: "profile", component: UserProfileComponent, canActivate: [AuthGuard] },
  { path: "notifications", component: NotificationsComponent, canActivate: [AuthGuard] },
  { path: "mes-demandes", component: MesDemandesComponent, canActivate: [AuthGuard, RoleGuard], data: { nonAdminOnly: true } },
  { path: "qr-code", component: QrCodeComponent, canActivate: [AuthGuard] },
  { path: "reclamation-public", component: ReclamationPublicComponent },
  { path: "suivi-reclamation", component: SuiviReclamationComponent },

  {
    path: "auth",
    children: [
      { path: "signup", component: SignupComponent },
      { path: "signin", component: SigninComponent },
      { path: "verify-otp", component: LoginVerifyComponent },
      { path: "forgot-password", component: ForgotPasswordComponent },
      { path: "forgot-password/verify", component: ForgotPasswordVerifyComponent },
      { path: "forgot-password/reset", component: ForgotPasswordResetComponent },
    ],
  },

  { path: "**", redirectTo: "/auth/signin" },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
