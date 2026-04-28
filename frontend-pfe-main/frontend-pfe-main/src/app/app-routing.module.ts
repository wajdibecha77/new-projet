import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { ReclamationsAdminComponent } from "./components/reclamations-admin/reclamations-admin.component";
import { SignupComponent } from "./template/dashboards/auth/signup/signup.component";
import { SigninComponent } from "./template/dashboards/auth/signin/signin.component";
import { ForgotPasswordComponent } from "./template/dashboards/auth/forgot-password/forgot-password.component";
import { ForgotPasswordVerifyComponent } from "./template/dashboards/auth/forgot-password-verify/forgot-password-verify.component";
import { ForgotPasswordResetComponent } from "./template/dashboards/auth/forgot-password-reset/forgot-password-reset.component";
import { LoginVerifyComponent } from "./components/login-verify/login-verify.component";

import { DashboardComponent } from "./components/dashboard/dashboard.component";
import { DashboardHomeComponent } from "./components/dashboard-home/dashboard-home.component";
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
import { LandingComponent } from "./pages/landing/landing.component";
import { ReclamationPublicComponent } from "./pages/reclamation-public/reclamation-public.component";
import { SuiviReclamationComponent } from "./pages/suivi-reclamation/suivi-reclamation.component";
import { ConfirmLoginComponent } from "./components/confirm-login/confirm-login.component";
import { LoginComponent } from "./components/login/login.component";

const routes: Routes = [
  { path: "", component: LandingComponent, pathMatch: "full" },
  { path: "login", component: LoginComponent },
  { path: "admin/dashboard", redirectTo: "/dashboard", pathMatch: "full" },
  { path: "technicien/dashboard", redirectTo: "/dashboard-client", pathMatch: "full" },
  { path: "reclamation-public", component: ReclamationPublicComponent },
  { path: "suivi-reclamation", component: SuiviReclamationComponent },
  {
    path: "auth",
    children: [
      { path: "signup", component: SignupComponent },
      { path: "signin", component: SigninComponent },
      { path: "login-verify-otp", component: LoginVerifyComponent },
      { path: "confirm-login", component: ConfirmLoginComponent },
      { path: "forgot-password", component: ForgotPasswordComponent },
      { path: "verify-otp", component: ForgotPasswordVerifyComponent },
      { path: "reset-password", component: ForgotPasswordResetComponent },
      { path: "forgot-password/verify", component: ForgotPasswordVerifyComponent },
      { path: "forgot-password/reset", component: ForgotPasswordResetComponent },
    ],
  },
  {
    path: "",
    component: DashboardComponent,
    canActivate: [AuthGuard],
    children: [
      { path: "reclamation", component: ReclamationComponent },
      {
        path: "reclamations",
        component: ReclamationsAdminComponent,
        canActivate: [RoleGuard],
        data: { adminsOnly: true },
      },
      {
        path: "dashboard",
        component: DashboardHomeComponent,
        canActivate: [RoleGuard],
        data: { adminsOnly: true },
      },
      {
        path: "dashboard-visiteur",
        component: DashboardVisiteurComponent,
        canActivate: [RoleGuard],
        data: { nonAdminOnly: true },
      },
      {
        path: "users",
        component: ListingUsersComponent,
        canActivate: [RoleGuard],
        data: { adminsOnly: true },
      },
      {
        path: "interventions",
        component: ListingInterventionsComponent,
        canActivate: [RoleGuard],
        data: { adminsOnly: true },
      },
      {
        path: "mes-interventions",
        component: MesInterventionsComponent,
        canActivate: [RoleGuard],
        data: { techniciansOnly: true },
      },
      {
        path: "dashboard-client",
        component: DashboardVisiteurComponent,
        canActivate: [RoleGuard],
        data: { techniciansOnly: true },
      },
      { path: "intervention/:id", component: InterventionDetailsComponent },
      {
        path: "services",
        component: ListingServicesComponent,
        canActivate: [RoleGuard],
        data: { adminsOnly: true },
      },
      {
        path: "fournisseurs",
        component: ListingFournisseursComponent,
        canActivate: [RoleGuard],
        data: { adminsOnly: true },
      },
      { path: "commandes", component: ListingOrdersComponent },
      {
        path: "create-user",
        component: CreateUserComponent,
        canActivate: [RoleGuard],
        data: { adminsOnly: true },
      },
      {
        path: "create-user/:id",
        component: CreateUserComponent,
        canActivate: [RoleGuard],
        data: { adminsOnly: true },
      },
      { path: "create-intervention", component: CreateInterventionComponent },
      { path: "create-service", component: CreateServiceComponent },
      { path: "create-service/:id", component: CreateServiceComponent },
      { path: "create-fournisseur", component: CreateFournisseurComponent },
      { path: "create-fournisseur/:id", component: CreateFournisseurComponent },
      { path: "create-order", component: CreateOrderComponent },
      { path: "create-order/:id", component: CreateOrderComponent },
      { path: "create-order-intervention/:id", component: CreateOrderInterventionComponent },
      { path: "profile", component: UserProfileComponent },
      { path: "notifications", component: NotificationsComponent },
      {
        path: "mes-demandes",
        component: MesDemandesComponent,
        canActivate: [RoleGuard],
        data: { nonAdminOnly: true },
      },
      { path: "qr-code", component: QrCodeComponent },
    ],
  },
  { path: "**", redirectTo: "" },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
